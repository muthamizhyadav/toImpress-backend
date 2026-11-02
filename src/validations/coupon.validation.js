const Joi = require('joi');

const createCoupon = {
  body: Joi.object().keys({
    // Auto coupons are applied automatically, so they do not need a code.
    code: Joi.string().min(3).max(20).uppercase().trim().when('couponFor', {
      is: 'auto',
      then: Joi.optional(),
      otherwise: Joi.required()
    }),
    discount: Joi.number().required().min(0),
    type: Joi.string().required().valid('percentage', 'fixed'),
    couponFor: Joi.string().required().valid('product', 'minPurchase', 'auto'),
    // Product ids are UUID strings, not mongo ObjectIds.
    products: Joi.array().items(Joi.string()).optional().default([]),
    category: Joi.string().allow('', null).optional(),
    discountName: Joi.string().allow('', null).optional(),
    offerAmount: Joi.alternatives().try(Joi.number(), Joi.string().allow('', null)).optional(),
    offerDiscount: Joi.alternatives().try(Joi.number(), Joi.string().allow('', null)).optional(),
    minPurchaseAmount: Joi.number().min(0).when('couponFor', {
      is: 'minPurchase',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    isActive: Joi.boolean().default(true),
    maxUsage: Joi.number().min(1).allow(null).default(null)
  }).custom((value, helpers) => {
    // Custom validation for percentage discount (auto coupons keep their
    // minimum cart value in `discount`, so the percentage limit does not apply)
    if (value.couponFor !== 'auto' && value.type === 'percentage' && value.discount > 100) {
      return helpers.error('any.invalid', { message: 'Percentage discount cannot be more than 100%' });
    }
    return value;
  })
};

const getCoupons = {
  query: Joi.object().keys({
    code: Joi.string(),
    type: Joi.string().valid('percentage', 'fixed'),
    couponFor: Joi.string().valid('product', 'minPurchase'),
    isActive: Joi.boolean(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getCoupon = {
  params: Joi.object().keys({
    couponId: Joi.string().required(),
  }),
};

const getCouponByCode = {
  params: Joi.object().keys({
    code: Joi.string().required().min(3).max(20).uppercase().trim(),
  }),
};

const updateCoupon = {
  params: Joi.object().keys({
    couponId: Joi.string().required(),
  }),
  body: Joi.object()
    .keys({
      code: Joi.string().min(3).max(20).uppercase().trim(),
      discount: Joi.number().min(0),
      type: Joi.string().valid('percentage', 'fixed'),
      couponFor: Joi.string().valid('product', 'minPurchase', 'auto'),
      products: Joi.array().items(Joi.string()).optional(),
      category: Joi.string().allow('', null),
      discountName: Joi.string().allow('', null),
      offerAmount: Joi.alternatives().try(Joi.number(), Joi.string().allow('', null)),
      offerDiscount: Joi.alternatives().try(Joi.number(), Joi.string().allow('', null)),
      minPurchaseAmount: Joi.number().min(0),
      isActive: Joi.boolean(),
      maxUsage: Joi.number().min(1).allow(null)
    })
    .min(1)
    .custom((value, helpers) => {
      // Custom validation for percentage discount (auto coupons keep their
      // minimum cart value in `discount`, so the percentage limit does not apply)
      if (value.couponFor !== 'auto' && value.type === 'percentage' && value.discount > 100) {
        return helpers.error('any.invalid', { message: 'Percentage discount cannot be more than 100%' });
      }
      // Validate minPurchaseAmount for minPurchase coupons
      if (value.couponFor === 'minPurchase' && !value.minPurchaseAmount) {
        return helpers.error('any.invalid', { message: 'Minimum purchase amount is required for minimum purchase coupons' });
      }
      return value;
    }),
};

const deleteCoupon = {
  params: Joi.object().keys({
    couponId: Joi.string().required(),
  }),
};

const validateCoupon = {
  body: Joi.object().keys({
    code: Joi.string().required().min(3).max(20).uppercase().trim(),
    cartTotal: Joi.number().min(0),
    productIds: Joi.array().items(Joi.string())
  }),
};

const applyCoupon = {
  body: Joi.object().keys({
    code: Joi.string().required().min(3).max(20).uppercase().trim(),
    cartTotal: Joi.number().required().min(0),
    productIds: Joi.array().items(Joi.string()).required()
  }),
};

module.exports = {
  createCoupon,
  getCoupons,
  getCoupon,
  getCouponByCode,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  applyCoupon,
};
