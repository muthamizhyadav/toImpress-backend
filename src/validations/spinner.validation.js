const Joi = require('joi');
const { objectId } = require('./custom.validation');

const REWARD_TYPES = [
  'percent_discount',
  'flat_discount',
  'threshold_discount',
  'free_shipping',
  'coupon',
  'points',
  'try_again',
];

const APPLIES_TO = ['all_products', 'specific_categories', 'specific_products'];

const segmentSchema = Joi.object().keys({
  label: Joi.string().required().trim().max(80),
  rewardType: Joi.string()
    .required()
    .valid(...REWARD_TYPES),
  value: Joi.string().allow('').optional(),
  minOrderAmount: Joi.number().min(0).optional().when('rewardType', {
    is: 'threshold_discount',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  color: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  probability: Joi.number().min(0).optional(),
});

const spinnerBodyKeys = {
  name: Joi.string().required().trim().max(120),
  description: Joi.string().allow('').optional(),
  eventName: Joi.string().allow('').optional(),
  appliesTo: Joi.string().valid(...APPLIES_TO),
  categories: Joi.array().items(Joi.string()).optional(),
  products: Joi.array().items(Joi.string()).optional(),
  minPurchaseAmount: Joi.number().min(0).optional(),
  maxSpinsPerUser: Joi.number().integer().min(1).optional(),
  startDate: Joi.date().allow(null).optional(),
  endDate: Joi.date().allow(null).optional(),
  isActive: Joi.boolean().optional(),
  segments: Joi.array().items(segmentSchema).min(2).max(24).optional(),
};

const validateScope = (value, helpers) => {
  if (value.appliesTo === 'specific_categories' && (!value.categories || value.categories.length === 0)) {
    return helpers.message('categories are required when appliesTo is "specific_categories"');
  }
  if (value.appliesTo === 'specific_products' && (!value.products || value.products.length === 0)) {
    return helpers.message('products are required when appliesTo is "specific_products"');
  }
  if (value.startDate && value.endDate && new Date(value.startDate) >= new Date(value.endDate)) {
    return helpers.message('endDate must be after startDate');
  }
  return value;
};

const createSpinner = {
  body: Joi.object()
    .keys({
      ...spinnerBodyKeys,
      appliesTo: Joi.string()
        .valid(...APPLIES_TO)
        .default('all_products'),
      segments: Joi.array().items(segmentSchema).min(2).max(24).required(),
    })
    .custom(validateScope),
};

const getSpinners = {
  query: Joi.object().keys({
    name: Joi.string(),
    eventName: Joi.string(),
    appliesTo: Joi.string().valid(...APPLIES_TO),
    isActive: Joi.boolean(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getSpinner = {
  params: Joi.object().keys({
    spinnerId: Joi.string().custom(objectId),
  }),
};

const updateSpinner = {
  params: Joi.object().keys({
    spinnerId: Joi.string().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      ...spinnerBodyKeys,
      name: Joi.string().trim().max(120),
      segments: Joi.array().items(segmentSchema).min(2).max(24).optional(),
    })
    .min(1)
    .custom(validateScope),
};

const deleteSpinner = {
  params: Joi.object().keys({
    spinnerId: Joi.string().custom(objectId),
  }),
};

const spinSpinner = {
  params: Joi.object().keys({
    spinnerId: Joi.string().custom(objectId),
  }),
  body: Joi.object().keys({
    cartTotal: Joi.number().min(0).optional(),
    productIds: Joi.array().items(Joi.string()).optional(),
  }),
};

module.exports = {
  createSpinner,
  getSpinners,
  getSpinner,
  updateSpinner,
  deleteSpinner,
  spinSpinner,
  REWARD_TYPES,
  APPLIES_TO,
};
