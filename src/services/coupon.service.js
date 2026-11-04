const httpStatus = require('http-status');
const { Coupon, Category, Product, Spinner } = require('../models');
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
  if (updateBody.code) {
    const duplicate = await Coupon.findOne({
      code: updateBody.code.toUpperCase(),
      _id: { $ne: couponId },
    });
    if (duplicate) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon code already taken');
    }
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
 * Resolve or dynamically create a spin-the-wheel coupon if the code matches
 * a spin campaign pattern or segment value.
 * @param {string} code
 * @returns {Promise<Coupon|null>}
 */
const resolveSpinnerCoupon = async (code) => {
  if (!code || typeof code !== 'string') return null;
  const normalizedCode = code.trim().toUpperCase();

  const spinPattern = /^(?:DIWALI|SPIN)(?:-?(\d+))?(?:-([A-Z0-9]+))?$/i;
  const match = normalizedCode.match(spinPattern);
  if (!match) return null;

  const activeSpinners = await Spinner.find({ isActive: true });
  if (!activeSpinners || !activeSpinners.length) return null;

  const allSegments = [];
  activeSpinners.forEach((sp) => {
    (sp.segments || []).forEach((seg, idx) => {
      allSegments.push({ spinner: sp, segment: seg, index: idx });
    });
  });

  const valueFromCode = match[1];

  let matched = null;
  if (valueFromCode) {
    matched = allSegments.find((item) => {
      const segVal = String(item.segment.value || '').replace(/[^0-9]/g, '');
      return segVal === valueFromCode;
    });
  }

  if (!matched && allSegments.length > 0) {
    matched = allSegments.find((s) => s.segment.rewardType === 'flat_discount') || allSegments[0];
  }

  if (!matched) return null;

  const { segment } = matched;
  const discountVal = Number(segment.value) || 0;
  const discountType = segment.rewardType === 'percent_discount' ? 'percentage' : 'fixed';

  let created = await Coupon.findOne({ code: normalizedCode });
  if (!created) {
    created = await Coupon.create({
      code: normalizedCode,
      discount: discountVal,
      type: discountType,
      couponFor: segment.mapType === 'category' && segment.categoryId ? 'category' : 'all',
      category: segment.mapType === 'category' && segment.categoryId ? segment.categoryId : undefined,
      discountName: segment.label || 'Spin & Win Reward',
      minPurchaseAmount: segment.minOrderAmount || 0,
      isActive: true,
      maxUsage: 1000,
      usageCount: 0,
    });
  }

  return created;
};

/**
 * Validate coupon for application
 * @param {string} code
 * @param {number} cartTotal
 * @param {Array} productIds
 * @returns {Promise<Object>}
 */
const validateCoupon = async (code, cartTotal = 0, productIds = []) => {
  let coupon = await getCouponByCode(code);

  if (!coupon) {
    coupon = await resolveSpinnerCoupon(code);
  }

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
 * @param {ObjectId|string} productId
 * @returns {Promise<Array>}
 */
const getActiveCouponsForProduct = async (productId) => {
  const product = await Product.findById(productId);
  const categories = await Category.find({});

  let categoryIdentifiers = [];
  if (product && product.category) {
    categoryIdentifiers = getCategoryIdentifiers(product.category, categories);
  }

  const coupons = await Coupon.find({
    isActive: true,
    $or: [
      { products: { $in: [productId] } },
      { products: { $size: 0 } },
      { category: { $in: categoryIdentifiers } },
      { couponFor: { $in: ['minPurchase', 'auto'] } },
    ],
  });

  return coupons.filter((coupon) => {
    const pIds = getCouponProductIds(coupon.products || []);
    if (pIds.length > 0) {
      return pIds.includes(String(productId));
    }
    if (coupon.category && product && product.category) {
      return doesCategoryMatch(coupon.category, product.category, categories);
    }
    return true;
  });
};

/**
 * Normalise the products stored on a coupon to an array of string ids.
 * @param {Array} products
 * @returns {Array<string>}
 */
const getCouponProductIds = (products = []) => products.map((product) => String(product?._id ?? product));

/**
 * Returns matching identifier strings ([_id, categoryTitle]) for a category value.
 * @param {string} categoryNameOrId
 * @param {Array<Object>} categories
 * @returns {Array<string>}
 */
const getCategoryIdentifiers = (categoryNameOrId, categories = []) => {
  if (!categoryNameOrId) return [];
  const str = String(categoryNameOrId).trim();
  const match = categories.find(
    (c) => c._id === str || (c.categoryTitle && c.categoryTitle.toLowerCase() === str.toLowerCase())
  );
  if (match) {
    return [match._id, match.categoryTitle];
  }
  return [str];
};

/**
 * Check whether a coupon's category matches an item's category.
 * @param {string} couponCategory
 * @param {string} itemCategory
 * @param {Array<Object>} categories
 * @returns {boolean}
 */
const doesCategoryMatch = (couponCategory, itemCategory, categories = []) => {
  if (!couponCategory) return true;
  if (!itemCategory) return false;
  if (couponCategory === itemCategory) return true;

  const cMatches = getCategoryIdentifiers(couponCategory, categories);
  const iMatches = getCategoryIdentifiers(itemCategory, categories);
  return cMatches.some((c) => iMatches.includes(c));
};

/**
 * Pick the cart lines a coupon can discount.
 * @param {Object} coupon
 * @param {Array<{productId: string, total: number, category?: string}>} items
 * @param {Array<Object>} [categories]
 * @returns {Array}
 */
const getEligibleItems = (coupon, items = [], categories = []) => {
  const couponProductIds = getCouponProductIds(coupon.products || []);
  const hasProducts = couponProductIds.length > 0;
  const hasCategory = Boolean(coupon.category && String(coupon.category).trim());

  // 1. If coupon specifies products, match on product ids:
  if (hasProducts) {
    return items.filter((item) => couponProductIds.includes(String(item.productId)));
  }

  // 2. If coupon specifies category without products, match on category:
  if (hasCategory) {
    return items.filter((item) => doesCategoryMatch(coupon.category, item.category, categories));
  }

  // 3. Otherwise (global coupon), all items in cart are eligible
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
 * @param {Array<Object>} [categories]
 * @returns {Object|null}
 */
const calculateCouponDiscount = (coupon, items = [], cartTotal = 0, categories = []) => {
  if (!coupon || coupon.isActive === false) return null;

  const eligibleItems = getEligibleItems(coupon, items, categories);
  const eligibleTotal = eligibleItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  if (eligibleTotal <= 0) return null;

  const total = Number(cartTotal) || eligibleTotal;
  const discountValue = Number(coupon.discount) || 0;
  let discount = 0;
  let percent = 0;
  let threshold = eligibleTotal;
  let meetsThreshold = true;

  if (coupon.couponFor === 'product') {
    threshold = 0;
    if (coupon.type === 'percentage') {
      percent = discountValue;
      discount = (eligibleTotal * percent) / 100;
    } else {
      discount = Math.min(discountValue, eligibleTotal);
    }
  } else if (coupon.couponFor === 'minPurchase') {
    threshold = Number(coupon.minPurchaseAmount ?? coupon.discount ?? 0);
    if (threshold > 0 && total < threshold) {
      meetsThreshold = false;
    }

    if (coupon.type === 'percentage') {
      percent = discountValue;
      discount = (eligibleTotal * percent) / 100;
    } else {
      discount = Math.min(discountValue, eligibleTotal);
    }
  } else {
    // Auto coupons: discount stores the minimum cart value / threshold and
    // offerDiscount stores the percentage, offerAmount an optional flat value.
    threshold = discountValue;
    if (threshold > 0 && total < threshold) {
      meetsThreshold = false;
    }

    const offeredPercent = Number(coupon.offerDiscount);
    const offeredAmount = Number(coupon.offerAmount);

    if (coupon.type === 'percentage' || (!coupon.type && offeredPercent > 0)) {
      if (offeredPercent > 0) {
        percent = offeredPercent;
      } else if (discountValue > 0) {
        percent = discountValue;
      }
      discount = (eligibleTotal * percent) / 100;
    } else if (offeredAmount > 0) {
      discount = Math.min(offeredAmount, eligibleTotal);
    } else if (discountValue > 0) {
      discount = Math.min(discountValue, eligibleTotal);
    }

    if (threshold > 0 && meetsThreshold) {
      discount = Math.min(discount, threshold);
    }
  }

  discount = Math.round(Math.min(discount, eligibleTotal, total) * 100) / 100;

  return {
    coupon,
    discount: meetsThreshold ? discount : 0,
    potentialDiscount: discount,
    eligibleTotal,
    threshold,
    percent,
    meetsThreshold,
    eligibleProductIds: eligibleItems.map((item) => String(item.productId)),
  };
};

/**
 * Get the best coupon discount for a set of cart lines.
 * @param {Array<Object>} coupons
 * @param {Array<{productId: string, total: number, category?: string}>} items
 * @param {number} cartTotal
 * @param {Array<Object>} [categories]
 * @returns {Object} { best, bestPotential, allCalculations }
 */
const getBestCouponDiscount = (coupons = [], items = [], cartTotal = 0, categories = []) => {
  let best = null;
  let bestPotential = null;
  const allCalculations = [];

  coupons.forEach((coupon) => {
    const result = calculateCouponDiscount(coupon, items, cartTotal, categories);
    if (!result) return;
    allCalculations.push(result);

    if (result.meetsThreshold && result.discount > 0) {
      if (!best || result.discount > best.discount) {
        best = result;
      }
    } else {
      if (
        !bestPotential ||
        (result.threshold > 0 && (bestPotential.threshold === 0 || result.threshold < bestPotential.threshold))
      ) {
        bestPotential = result;
      }
    }
  });

  return { best, bestPotential, allCalculations };
};

const getCouponByProductAndAmount = async (body) => {
  const results = [];
  const categories = await Category.find({});

  for (const item of body) {
    const { category, ids = [], total = 0 } = item;
    if (!Array.isArray(ids) || ids.length === 0) continue;

    const categoryIdentifiers = category ? getCategoryIdentifiers(category, categories) : [];
    const coupons = await Coupon.find({
      isActive: true,
      $or: [
        { products: { $in: ids } },
        { products: { $size: 0 } },
        { category: { $in: categoryIdentifiers } },
        { couponFor: { $in: ['minPurchase', 'auto'] } },
      ],
    });

    // The endpoint only receives a grouped total, split it across the lines so
    // product coupons are calculated on their own share.
    const perItemTotal = Number(total) / ids.length;
    const pricedItems = ids.map((productId) => ({
      productId,
      total: perItemTotal,
      category,
    }));

    const { best } = getBestCouponDiscount(coupons, pricedItems, Number(total), categories);
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
  getCouponProductIds,
  getCategoryIdentifiers,
  doesCategoryMatch,
  getEligibleItems,
  calculateCouponDiscount,
  getBestCouponDiscount,
};
