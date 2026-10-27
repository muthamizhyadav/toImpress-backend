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
    const couponProductIds = getCouponProductIds(coupon.products);
    const hasEligibleProduct = productIds.some((productId) => couponProductIds.includes(String(productId)));

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

/**
 * Normalise the products stored on a coupon to an array of string ids.
 * @param {Array} products
 * @returns {Array<string>}
 */
const getCouponProductIds = (products = []) => products.map((product) => String(product?._id ?? product));

/**
 * Pick the cart lines a coupon can discount.
 * @param {Object} coupon
 * @param {Array<{productId: string, total: number, category?: string}>} items
 * @returns {Array}
 */
const getEligibleItems = (coupon, items) => {
  if (coupon.couponFor === 'product') {
    const productIds = getCouponProductIds(coupon.products || []);
    if (productIds.length === 0) return items;
    return items.filter((item) => productIds.includes(String(item.productId)));
  }

  if (coupon.category) {
    const categoryItems = items.filter((item) => item.category === coupon.category);
    if (categoryItems.length > 0) return categoryItems;
  }

  return items;
};

/**
 * Calculate the discount a single coupon gives for the supplied cart lines.
 *
 * Product coupons use their own discount value on the eligible products,
 * min-purchase coupons apply to the eligible total once the threshold is met,
 * and auto coupons keep using discount (threshold) + offerDiscount (percentage).
 *
 * @param {Object} coupon
 * @param {Array<{productId: string, total: number, category?: string}>} items
 * @param {number} cartTotal
 * @returns {Object|null}
 */
const calculateCouponDiscount = (coupon, items = [], cartTotal = 0) => {
  if (!coupon || coupon.isActive === false) return null;

  const eligibleItems = getEligibleItems(coupon, items);
  const eligibleTotal = eligibleItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  if (eligibleTotal <= 0) return null;

  const total = Number(cartTotal) || eligibleTotal;
  const discountValue = Number(coupon.discount) || 0;
  let discount = 0;
  let percent = 0;
  let threshold = eligibleTotal;

  if (coupon.couponFor === 'product') {
    if (coupon.type === 'percentage') {
      percent = discountValue;
      discount = (eligibleTotal * percent) / 100;
    } else {
      discount = Math.min(discountValue, eligibleTotal);
    }
  } else if (coupon.couponFor === 'minPurchase') {
    threshold = Number(coupon.minPurchaseAmount ?? coupon.discount ?? 0);
    if (total < threshold) return null;

    if (coupon.type === 'percentage') {
      percent = discountValue;
      discount = (eligibleTotal * percent) / 100;
    } else {
      discount = Math.min(discountValue, eligibleTotal);
    }
  } else {
    // Auto coupons: discount stores the minimum cart value and
    // offerDiscount stores the percentage, offerAmount an optional flat value.
    threshold = discountValue;
    if (threshold > 0 && total < threshold) return null;

    const offeredPercent = Number(coupon.offerDiscount);
    const offeredAmount = Number(coupon.offerAmount);

    if (coupon.type === 'percentage' || (!coupon.type && offeredPercent > 0)) {
      if (!(offeredPercent > 0)) return null;
      percent = offeredPercent;
      discount = (eligibleTotal * percent) / 100;
    } else if (offeredAmount > 0) {
      discount = Math.min(offeredAmount, eligibleTotal);
    } else if (discountValue > 0) {
      discount = Math.min(discountValue, eligibleTotal);
    } else {
      return null;
    }

    if (threshold > 0) {
      discount = Math.min(discount, threshold);
    }
  }

  discount = Math.round(Math.min(discount, eligibleTotal, total) * 100) / 100;
  if (!(discount > 0)) return null;

  return {
    coupon,
    discount,
    eligibleTotal,
    threshold,
    percent,
    eligibleProductIds: eligibleItems.map((item) => String(item.productId)),
  };
};

/**
 * Get the best coupon discount for a set of cart lines.
 * @param {Array<Object>} coupons
 * @param {Array<{productId: string, total: number, category?: string}>} items
 * @param {number} cartTotal
 * @returns {Object|null}
 */
const getBestCouponDiscount = (coupons = [], items = [], cartTotal = 0) => {
  let best = null;

  coupons.forEach((coupon) => {
    const result = calculateCouponDiscount(coupon, items, cartTotal);
    if (result && (!best || result.discount > best.discount)) {
      best = result;
    }
  });

  return best;
};

const getCouponByProductAndAmount = async (body) => {
  const results = [];

  for (const item of body) {
    const { category, ids = [], total = 0 } = item;
    if (!Array.isArray(ids) || ids.length === 0) continue;

    const coupons = await Coupon.find({
      products: { $in: ids },
      isActive: true,
    });

    // The endpoint only receives a grouped total, split it across the lines so
    // product coupons are calculated on their own share.
    const perItemTotal = Number(total) / ids.length;
    const pricedItems = ids.map((productId) => ({
      productId,
      total: perItemTotal,
      category,
    }));

    const best = getBestCouponDiscount(coupons, pricedItems, Number(total));
    if (!best) continue;

    results.push({
      category,
      total: Number(total),
      finalDiscount: best.discount,
      netAmount: Math.max(Number(total) - best.discount, 0),
      discount: best.percent || best.coupon.discount,
      type: best.coupon.type,
      couponCode: best.coupon.code,
    });
  }

  return {
    coupenDetails: results,
    totalDiscount: Math.round(results.reduce((acc, curr) => acc + curr.finalDiscount, 0) * 100) / 100,
  };
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
  calculateCouponDiscount,
  getBestCouponDiscount,
};
