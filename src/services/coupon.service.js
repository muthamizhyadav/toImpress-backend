const httpStatus = require('http-status');
const { Coupon } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create a coupon
 * @param {Object} couponBody
 * @returns {Promise<Coupon>}
 */
const createCoupon = async (couponBody) => {
  return Coupon.create(couponBody);
};

/**
 * Query for coupons
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryCoupons = async (filter, options) => {
  const coupons = await Coupon.paginate(filter, options);
  return coupons;
};

/**
 * Get coupon by id
 * @param {ObjectId} id
 * @returns {Promise<Coupon>}
 */
const getCouponById = async (id) => {
  return Coupon.findById(id).populate('products');
};

/**
 * Get coupon by code
 * @param {string} code
 * @returns {Promise<Coupon>}
 */
const getCouponByCode = async (code) => {
  return Coupon.findOne({ code: code.toUpperCase() }).populate('products');
};

/**
 * Update coupon by id
 * @param {ObjectId} couponId
 * @param {Object} updateBody
 * @returns {Promise<Coupon>}
 */
const updateCouponById = async (couponId, updateBody) => {
  const coupon = await getCouponById(couponId);
  if (!coupon) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Coupon not found');
  }
  if (updateBody.code && (await Coupon.isCodeTaken(updateBody.code, couponId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon code already taken');
  }
  Object.assign(coupon, updateBody);
  await coupon.save();
  return coupon;
};

/**
 * Delete coupon by id
 * @param {ObjectId} couponId
 * @returns {Promise<Coupon>}
 */
const deleteCouponById = async (couponId) => {
  const coupon = await getCouponById(couponId);
  if (!coupon) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Coupon not found');
  }
  await coupon.remove();
  return coupon;
};

/**
 * Validate coupon for application
 * @param {string} code
 * @param {number} cartTotal
 * @param {Array} productIds
 * @returns {Promise<Object>}
 */
const validateCoupon = async (code, cartTotal = 0, productIds = []) => {
  const coupon = await getCouponByCode(code);

  if (!coupon) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Coupon not found');
  }

  if (!coupon.isActive) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon is not active');
  }

  // Check usage limit
  if (coupon.maxUsage && coupon.usageCount >= coupon.maxUsage) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon usage limit exceeded');
  }

  // Check minimum purchase amount for minPurchase coupons
  if (coupon.couponFor === 'minPurchase' && cartTotal < coupon.minPurchaseAmount) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Minimum purchase amount of ₹${coupon.minPurchaseAmount} required`);
  }

  // Check product eligibility for product coupons
  if (coupon.couponFor === 'product' && coupon.products.length > 0) {
    const couponProductIds = coupon.products.map((p) => p._id.toString());
    const hasEligibleProduct = productIds.some((productId) => couponProductIds.includes(productId.toString()));

    if (!hasEligibleProduct) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'No eligible products in cart for this coupon');
    }
  }

  return {
    valid: true,
    coupon,
    message: 'Coupon is valid',
  };
};

/**
 * Apply coupon and calculate discount
 * @param {string} code
 * @param {number} cartTotal
 * @param {Array} productIds
 * @returns {Promise<Object>}
 */
const applyCoupon = async (code, cartTotal, productIds) => {
  const validation = await validateCoupon(code, cartTotal, productIds);
  const { coupon } = validation;

  let discountAmount = 0;

  if (coupon.type === 'percentage') {
    discountAmount = (cartTotal * coupon.discount) / 100;
  } else if (coupon.type === 'fixed') {
    discountAmount = Math.min(coupon.discount, cartTotal);
  }

  // Ensure discount doesn't exceed cart total
  discountAmount = Math.min(discountAmount, cartTotal);

  const finalAmount = cartTotal - discountAmount;

  return {
    couponCode: coupon.code,
    discountType: coupon.type,
    discountValue: coupon.discount,
    discountAmount: Math.round(discountAmount * 100) / 100, // Round to 2 decimal places
    originalAmount: cartTotal,
    finalAmount: Math.round(finalAmount * 100) / 100,
    savings: Math.round(discountAmount * 100) / 100,
  };
};

/**
 * Increment coupon usage count
 * @param {string} code
 * @returns {Promise<Coupon>}
 */
const incrementUsageCount = async (code) => {
  const coupon = await getCouponByCode(code);
  if (!coupon) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Coupon not found');
  }

  coupon.usageCount += 1;
  await coupon.save();
  return coupon;
};

/**
 * Get active coupons for a specific product
 * @param {ObjectId} productId
 * @returns {Promise<Array>}
 */
const getActiveCouponsForProduct = async (productId) => {
  return Coupon.find({
    isActive: true,
    $or: [
      { couponFor: 'minPurchase' },
      {
        couponFor: 'product',
        $or: [
          { products: { $size: 0 } }, // Global product coupons
          { products: productId },
        ],
      },
    ],
  });
};
const getCouponByProductAndAmount = async (body) => {
  const productIds = Object.keys(body);
  const productsWithAmount = Object.values(body);

  // Step 1: Fetch matching coupons
  const coupons = await Coupon.find({
    isActive: true,
    products: { $in: productIds },
  });

  // Step 2: Filter on product amount, minPurchase & discount rules
  const applicableCoupons = coupons.filter((coupon) =>
    productsWithAmount.some(
      (item) =>
        coupon.products.includes(item.id) && (coupon.minPurchaseAmount ?? 0) <= item.amount && item.amount >= coupon.discount // NEW RULE ✔️
    )
  );

  // Step 3: Group by category
  const groupedByCategory = applicableCoupons.reduce((acc, coupon) => {
    (acc[coupon.category] = acc[coupon.category] || []).push(coupon);
    return acc;
  }, {});

  // Step 4: Pick best coupon per category & calculate applied discount amount
  const finalResult = Object.keys(groupedByCategory).map((category) => {
    const coupons = groupedByCategory[category];

    const bestCoupon = coupons.reduce((prev, curr) => (curr.discount > prev.discount ? curr : prev));

    const product = productsWithAmount.find((p) => bestCoupon.products.includes(p.id));

    const amount = product?.amount ?? 0;

    let appliedDiscountAmount = 0;

    if (bestCoupon.type === 'percentage') {
      appliedDiscountAmount = Math.round((amount * Number(bestCoupon.offerDiscount)) / 100);
    } else if (bestCoupon.type === 'flat') {
      appliedDiscountAmount = bestCoupon.discount;
    }

    return {
      category,
      discount: bestCoupon.discount,
      offerDiscount: bestCoupon.offerDiscount,
      type: bestCoupon.type,
      appliedAmount: appliedDiscountAmount,
      actualAmount: amount,
    };
  });

  if (finalResult.length > 0) {
    const totalAppliedDiscount = finalResult.reduce((acc, curr) => acc + curr.appliedAmount, 0);
    console.log(totalAppliedDiscount);
    return {
      totalDiscount: totalAppliedDiscount,
      details: finalResult,
    };
  } else {
    return {
      totalDiscount: 0,
      details: [],
    };
  }
};

module.exports = {
  createCoupon,
  queryCoupons,
  getCouponById,
  getCouponByCode,
  updateCouponById,
  deleteCouponById,
  validateCoupon,
  applyCoupon,
  incrementUsageCount,
  getActiveCouponsForProduct,
  getCouponByProductAndAmount,
};
