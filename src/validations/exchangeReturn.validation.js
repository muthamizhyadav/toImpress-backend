const Joi = require('joi');

const createExchange = {
  body: Joi.object().keys({
    orderId: Joi.string().required(),
    orderItemId: Joi.string().required(),
    type: Joi.string().allow('exchange', 'return'),
    newSize: Joi.string().required(),
    currentSize: Joi.string().allow(''),
    reason: Joi.string()
      .valid('Size Too Small', 'Size Too Large', 'Defective Product', 'Wrong Product Received', 'Other')
      .required(),
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
  body: Joi.object()
    .keys({
      status: Joi.string().valid(
        'under_review',
        'approved',
        'rejected',
        'payment_pending',
        'pickup_scheduled',
        'product_received',
        'replacement_dispatched',
        'exchange_completed'
      ),
      adminNotes: Joi.string(),
    })
    .min(1),
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
    type: Joi.string().allow('exchange', 'return'),
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
  body: Joi.object()
    .keys({
      status: Joi.string().valid(
        'under_review',
        'approved',
        'rejected',
        'pickup_scheduled',
        'product_received',
        'quality_inspection',
        'refund_initiated',
        'refund_credited',
        'return_completed'
      ),
      refundAmount: Joi.number().min(0),
      adminNotes: Joi.string(),
    })
    .min(1),
};

const uploadImages = {
  body: Joi.object().keys({
    folder: Joi.string().valid('exchange', 'return').default('exchange'),
  }),
};

const getAdminRequests = {
  query: Joi.object().keys({
    page: Joi.number().integer(),
    limit: Joi.number().integer(),
    search: Joi.string().allow(''),
    status: Joi.string().allow(''),
  }),
};

const EXCHANGE_ADMIN_STATUSES = [
  'requested',
  'under_review',
  'approved',
  'payment_pending',
  'payment_completed',
  'pickup_scheduled',
  'product_received',
  'replacement_dispatched',
  'exchange_completed',
  'Exchange Requested',
  'Under Review',
  'Approved',
  'Payment Pending',
  'Payment Completed',
  'Pickup Scheduled',
  'Product Received at Warehouse',
  'Replacement Dispatched',
  'Exchange Completed',
];

const RETURN_ADMIN_STATUSES = [
  'requested',
  'under_review',
  'approved',
  'payment_pending',
  'pickup_scheduled',
  'product_received',
  'quality_inspection',
  'refund_initiated',
  'refund_credited',
  'return_completed',
  'Return Requested',
  'Under Review',
  'Approved',
  'Payment Pending',
  'Pickup Scheduled',
  'Product Received',
  'Quality Inspection',
  'Refund Initiated',
  'Refund Credited',
  'Return Completed',
];

const updateAdminExchangeStatus = {
  params: Joi.object().keys({ id: Joi.string().required() }),
  body: Joi.object()
    .keys({
      status: Joi.string()
        .valid(...EXCHANGE_ADMIN_STATUSES)
        .required(),
      note: Joi.string().allow(''),
      adminNotes: Joi.string().allow(''),
    })
    .min(1),
};

const updateAdminReturnStatus = {
  params: Joi.object().keys({ id: Joi.string().required() }),
  body: Joi.object()
    .keys({
      status: Joi.string()
        .valid(...RETURN_ADMIN_STATUSES)
        .required(),
      note: Joi.string().allow(''),
      adminNotes: Joi.string().allow(''),
      refundAmount: Joi.number().min(0),
    })
    .min(1),
};

const adminPayExchange = {
  params: Joi.object().keys({ id: Joi.string().required() }),
  body: Joi.object().keys({
    amount: Joi.number().min(0),
    method: Joi.string().allow(''),
  }),
};

const adminProcessRefund = {
  params: Joi.object().keys({ id: Joi.string().required() }),
  body: Joi.object().keys({
    method: Joi.string().allow(''),
    amount: Joi.number().min(0),
  }),
};

const adminExchangePickup = {
  params: Joi.object().keys({ id: Joi.string().required() }),
};

const adminDispatchReplacement = {
  params: Joi.object().keys({ id: Joi.string().required() }),
};

const adminExchangeTrack = {
  params: Joi.object().keys({ id: Joi.string().required() }),
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
  getAdminRequests,
  updateAdminExchangeStatus,
  updateAdminReturnStatus,
  adminPayExchange,
  adminProcessRefund,
  adminExchangePickup,
  adminDispatchReplacement,
  adminExchangeTrack,
};
