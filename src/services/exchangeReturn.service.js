const httpStatus = require('http-status');
const { Exchange, Return, Order } = require('../models');
const ApiError = require('../utils/ApiError');

// ==================== EXCHANGE ====================

const createExchange = async (req) => {
  const { orderId, orderItemId, newSize, reason, description, images } = req.body;
  const userId = req.user.id;

  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  if (order.user !== userId) throw new ApiError(httpStatus.FORBIDDEN, 'Access denied');

  const item = order.items.find((i) => i._id === orderItemId);
  if (!item) throw new ApiError(httpStatus.NOT_FOUND, 'Order item not found');

  const exchange = await Exchange.create({
    user: userId,
    orderId,
    orderItemId,
    product: item.product,
    productTitle: item.productTitle,
    productImage: item.productUrl || '',
    currentSize: item.selectedSize,
    newSize,
    reason,
    description: description || '',
    images: images || [],
    status: 'requested',
  });

  return exchange;
};

const getMyExchanges = async (req) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const filter = { user: userId };
  const sort = { createdAt: -1 };

  if (req.query.status) filter.status = req.query.status;

  const exchanges = await Exchange.find(filter).sort(sort).skip(skip).limit(limit);
  const total = await Exchange.countDocuments(filter);
  const totalPages = Math.ceil(total / limit);

  return {
    success: true,
    data: exchanges,
    pagination: { total, totalPages, currentPage: page, itemsPerPage: limit, hasNextPage: page < totalPages, hasPreviousPage: page > 1 },
  };
};

const getExchangeById = async (req) => {
  const { id } = req.params;
  const exchange = await Exchange.findById(id);
  if (!exchange) throw new ApiError(httpStatus.NOT_FOUND, 'Exchange request not found');
  if (req.user.role !== 'admin' && exchange.user !== req.user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied');
  }
  return exchange;
};

const updateExchangeStatus = async (req) => {
  const { id } = req.params;
  const { status, adminNotes } = req.body;

  const exchange = await Exchange.findById(id);
  if (!exchange) throw new ApiError(httpStatus.NOT_FOUND, 'Exchange request not found');

  exchange.status = status;
  if (adminNotes) exchange.adminNotes = adminNotes;
  await exchange.save();
  return exchange;
};

const payExchangeCharge = async (req) => {
  const { id } = req.params;
  const { paymentId, orderId } = req.body;
  const userId = req.user.id;

  const exchange = await Exchange.findById(id);
  if (!exchange) throw new ApiError(httpStatus.NOT_FOUND, 'Exchange request not found');
  if (exchange.user !== userId) throw new ApiError(httpStatus.FORBIDDEN, 'Access denied');
  if (exchange.status !== 'payment_pending') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Exchange is not awaiting payment');
  }

  exchange.status = 'payment_completed';
  exchange.paymentId = paymentId;
  exchange.paymentOrderId = orderId;
  await exchange.save();
  return exchange;
};

// ==================== RETURN ====================

const createReturn = async (req) => {
  const { orderId, orderItemId, reason, description, images } = req.body;
  const userId = req.user.id;

  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  if (order.user !== userId) throw new ApiError(httpStatus.FORBIDDEN, 'Access denied');

  const item = order.items.find((i) => i._id === orderItemId);
  if (!item) throw new ApiError(httpStatus.NOT_FOUND, 'Order item not found');

  const returnReq = await Return.create({
    user: userId,
    orderId,
    orderItemId,
    product: item.product,
    productTitle: item.productTitle,
    productImage: item.productUrl || '',
    reason,
    description: description || '',
    images: images || [],
    status: 'requested',
  });

  return returnReq;
};

const getMyReturns = async (req) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const filter = { user: userId };
  const sort = { createdAt: -1 };

  if (req.query.status) filter.status = req.query.status;

  const returns = await Return.find(filter).sort(sort).skip(skip).limit(limit);
  const total = await Return.countDocuments(filter);
  const totalPages = Math.ceil(total / limit);

  return {
    success: true,
    data: returns,
    pagination: { total, totalPages, currentPage: page, itemsPerPage: limit, hasNextPage: page < totalPages, hasPreviousPage: page > 1 },
  };
};

const getReturnById = async (req) => {
  const { id } = req.params;
  const returnReq = await Return.findById(id);
  if (!returnReq) throw new ApiError(httpStatus.NOT_FOUND, 'Return request not found');
  if (req.user.role !== 'admin' && returnReq.user !== req.user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied');
  }
  return returnReq;
};

const updateReturnStatus = async (req) => {
  const { id } = req.params;
  const { status, refundAmount, adminNotes } = req.body;

  const returnReq = await Return.findById(id);
  if (!returnReq) throw new ApiError(httpStatus.NOT_FOUND, 'Return request not found');

  returnReq.status = status;
  if (refundAmount !== undefined) returnReq.refundAmount = refundAmount;
  if (adminNotes) returnReq.adminNotes = adminNotes;
  await returnReq.save();
  return returnReq;
};

const uploadExchangeReturnImages = async (req) => {
  const { uploadMultipleToR2 } = require('../utils/multipleUpload');
  if (!req.files || req.files.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No files uploaded');
  }
  const folder = req.body.folder || 'exchange';
  const uploaded = await uploadMultipleToR2(req.files, folder);
  return uploaded;
};

module.exports = {
  createExchange,
  getMyExchanges,
  getExchangeById,
  updateExchangeStatus,
  payExchangeCharge,
  createReturn,
  getMyReturns,
  getReturnById,
  updateReturnStatus,
  uploadExchangeReturnImages,
};
