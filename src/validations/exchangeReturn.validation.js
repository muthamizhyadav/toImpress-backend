const Joi = require('joi');

const createExchange = {
  body: Joi.object().keys({
    orderId: Joi.string().required(),
    orderItemId: Joi.string().required(),
    newSize: Joi.string().required(),
    reason: Joi.string().valid('Size Too Small', 'Size Too Large', 'Defective Product', 'Wrong Product Received', 'Other').required(),
    description: Joi.string().allow(''),
    images: Joi.array().items(Joi.string()),
  }),
};

const getMyExchanges = {
  query: Joi.object().keys({
    status: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getExchange = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
};

const updateExchangeStatus = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
  body: Joi.object().keys({
    status: Joi.string().valid(
      'under_review', 'approved', 'rejected', 'payment_pending',
      'pickup_scheduled', 'product_received', 'replacement_dispatched', 'exchange_completed'
    ),
    adminNotes: Joi.string(),
  }).min(1),
};

const payExchangeCharge = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
  body: Joi.object().keys({
    paymentId: Joi.string().required(),
    orderId: Joi.string().required(),
  }),
};

const createReturn = {
  body: Joi.object().keys({
    orderId: Joi.string().required(),
    orderItemId: Joi.string().required(),
    reason: Joi.string().valid('Damaged Product', 'Wrong Product Received', 'Quality Issue', 'Other').required(),
    description: Joi.string().allow(''),
    images: Joi.array().items(Joi.string()).min(1).required(),
  }),
};

const getMyReturns = {
  query: Joi.object().keys({
    status: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getReturn = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
};

const updateReturnStatus = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
  body: Joi.object().keys({
    status: Joi.string().valid(
      'under_review', 'approved', 'rejected', 'pickup_scheduled',
      'product_received', 'quality_inspection', 'refund_initiated', 'refund_credited', 'return_completed'
    ),
    refundAmount: Joi.number().min(0),
    adminNotes: Joi.string(),
  }).min(1),
};

const uploadImages = {
  body: Joi.object().keys({
    folder: Joi.string().valid('exchange', 'return').default('exchange'),
  }),
};

module.exports = {
  createExchange,
  getMyExchanges,
  getExchange,
  updateExchangeStatus,
  payExchangeCharge,
  createReturn,
  getMyReturns,
  getReturn,
  updateReturnStatus,
  uploadImages,
};
