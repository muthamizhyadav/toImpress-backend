const httpStatus = require('http-status');
const { Exchange, Return, Order, User } = require('../models');
const ApiError = require('../utils/ApiError');

const EXCHANGE_STATUS_MAP = {
  requested: 'Exchange Requested',
  under_review: 'Under Review',
  approved: 'Approved',
  payment_pending: 'Payment Pending',
  payment_completed: 'Payment Completed',
  pickup_scheduled: 'Pickup Scheduled',
  product_received: 'Product Received at Warehouse',
  replacement_dispatched: 'Replacement Dispatched',
  exchange_completed: 'Exchange Completed',
};

const RETURN_STATUS_MAP = {
  requested: 'Return Requested',
  under_review: 'Under Review',
  approved: 'Approved',
  payment_pending: 'Payment Pending',
  pickup_scheduled: 'Pickup Scheduled',
  product_received: 'Product Received',
  quality_inspection: 'Quality Inspection',
  refund_initiated: 'Refund Initiated',
  refund_credited: 'Refund Credited',
  return_completed: 'Return Completed',
};

const toLabel = (map, value) => map[value] || value;
const toRaw = (map, value) => {
  if (map[value]) return value;
  const found = Object.entries(map).find(([, label]) => label === value);
  return found ? found[0] : value;
};

const buildUserMap = async (userIds) => {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return {};
  const users = await User.find({ _id: { $in: ids } })
    .select('name mobile address')
    .lean();
  return users.reduce((acc, u) => {
    acc[u._id] = u;
    return acc;
  }, {});
};

const customerName = (u) => u.name || (u.address && u.address[0] && u.address[0].name) || u.mobile || 'N/A';

const buildItemSizeMap = async (itemIds) => {
  const ids = [...new Set(itemIds.filter(Boolean))];
  if (!ids.length) return {};
  const orders = await Order.find({ 'items._id': { $in: ids } }).select('items').lean();
  const map = {};
  orders.forEach((o) => {
    (o.items || []).forEach((it) => {
      map[String(it._id)] = it.selectedSize || '';
    });
  });
  return map;
};

const getPaymentStatus = (status) => {
  if (
    ['payment_completed', 'pickup_scheduled', 'product_received', 'replacement_dispatched', 'exchange_completed'].includes(
      status
    )
  )
    return 'completed';
  if (['approved', 'payment_pending'].includes(status)) return 'pending';
  return undefined;
};

const getRefundStatus = (status) => {
  if (status === 'refund_initiated') return 'initiated';
  if (['refund_credited', 'return_completed'].includes(status)) return 'credited';
  return undefined;
};

// ==================== EXCHANGE ====================

const createExchange = async (req) => {
  const { orderId, orderItemId, newSize, currentSize, reason, description, images } = req.body;
  const userId = req.user.id;

  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  if (order.user !== userId) throw new ApiError(httpStatus.FORBIDDEN, 'Access denied');

  const item = order.items.find((i) => String(i._id) === orderItemId);
  if (!item) throw new ApiError(httpStatus.NOT_FOUND, 'Order item not found');

  const activeExchange = await Exchange.findOne({
    user: userId,
    orderItemId,
    status: { $nin: ['rejected', 'exchange_completed'] },
  });
  if (activeExchange) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'An exchange request already exists for this item');
  }

  const exchange = await Exchange.create({
    user: userId,
    orderId,
    orderItemId,
    product: item.product,
    productTitle: item.productTitle,
    productImage: item.productUrl || '',
    currentSize: currentSize || item.selectedSize || '',
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
    pagination: {
      total,
      totalPages,
      currentPage: page,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
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
  const { status, adminNotes, note } = req.body;

  const exchange = await Exchange.findById(id);
  if (!exchange) throw new ApiError(httpStatus.NOT_FOUND, 'Exchange request not found');

  exchange.status = toRaw(EXCHANGE_STATUS_MAP, status);
  if (adminNotes) exchange.adminNotes = adminNotes;
  if (note) exchange.adminNotes = note;
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

  const item = order.items.find((i) => String(i._id) === orderItemId);
  if (!item) throw new ApiError(httpStatus.NOT_FOUND, 'Order item not found');

  const activeReturn = await Return.findOne({
    user: userId,
    orderItemId,
    status: { $nin: ['rejected', 'return_completed', 'refund_credited'] },
  });
  if (activeReturn) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'A return request already exists for this item');
  }

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
    pagination: {
      total,
      totalPages,
      currentPage: page,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
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
  const { status, refundAmount, adminNotes, note } = req.body;

  const returnReq = await Return.findById(id);
  if (!returnReq) throw new ApiError(httpStatus.NOT_FOUND, 'Return request not found');

  returnReq.status = toRaw(RETURN_STATUS_MAP, status);
  if (refundAmount !== undefined) returnReq.refundAmount = refundAmount;
  if (adminNotes) returnReq.adminNotes = adminNotes;
  if (note) returnReq.adminNotes = note;
  await returnReq.save();
  return returnReq;
};

const getAdminExchanges = async (req) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const filter = {};

  const { status, search } = req.query;
  if (status) filter.status = toRaw(EXCHANGE_STATUS_MAP, status);

  if (search) {
    const userMatches = await User.find({
      $or: [{ name: { $regex: search, $options: 'i' } }, { mobile: { $regex: search, $options: 'i' } }],
    })
      .select('_id')
      .lean();
    const userFilter = userMatches.map((u) => u._id);
    filter.$or = [
      { orderId: { $regex: search, $options: 'i' } },
      { orderItemId: { $regex: search, $options: 'i' } },
      { productTitle: { $regex: search, $options: 'i' } },
      { _id: { $regex: search, $options: 'i' } },
    ];
    if (userFilter.length) filter.$or.push({ user: { $in: userFilter } });
  }

  const exchanges = await Exchange.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
  const total = await Exchange.countDocuments(filter);
  const totalPages = Math.ceil(total / limit);
  const users = await buildUserMap(exchanges.map((e) => e.user));
  const sizeMap = await buildItemSizeMap(exchanges.map((e) => e.orderItemId));

  const data = exchanges.map((e) => {
    const u = users[e.user] || {};
    const storedSize = e.currentSize || (e.selectedSize ? e.selectedSize : '');
    return {
      requestId: e._id,
      _id: e._id,
      orderId: e.orderId,
      orderItemId: e.orderItemId,
      userName: customerName(u),
      userMobile: u.mobile || '',
      user: e.user,
      productName: e.productTitle,
      productImage: e.productImage || '',
      selectedSize: storedSize || sizeMap[String(e.orderItemId)] || '',
      currentSize: storedSize || sizeMap[String(e.orderItemId)] || '',
      newSize: e.newSize,
      reason: e.reason,
      description: e.description,
      images: e.images || [],
      status: toLabel(EXCHANGE_STATUS_MAP, e.status),
      rawStatus: e.status,
      adminNote: e.adminNotes || '',
      paymentStatus: getPaymentStatus(e.status),
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  });

  return {
    success: true,
    data,
    total,
    totalPages,
    pagination: {
      total,
      totalPages,
      currentPage: page,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};

const getAdminReturns = async (req) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const filter = {};

  const { status, search } = req.query;
  if (status) filter.status = toRaw(RETURN_STATUS_MAP, status);

  if (search) {
    const userMatches = await User.find({
      $or: [{ name: { $regex: search, $options: 'i' } }, { mobile: { $regex: search, $options: 'i' } }],
    })
      .select('_id')
      .lean();
    const userFilter = userMatches.map((u) => u._id);
    filter.$or = [
      { orderId: { $regex: search, $options: 'i' } },
      { orderItemId: { $regex: search, $options: 'i' } },
      { productTitle: { $regex: search, $options: 'i' } },
      { _id: { $regex: search, $options: 'i' } },
    ];
    if (userFilter.length) filter.$or.push({ user: { $in: userFilter } });
  }

  const returns = await Return.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
  const total = await Return.countDocuments(filter);
  const totalPages = Math.ceil(total / limit);
  const users = await buildUserMap(returns.map((r) => r.user));
  const sizeMap = await buildItemSizeMap(returns.map((r) => r.orderItemId));

  const data = returns.map((r) => {
    const u = users[r.user] || {};
    const storedSize = r.currentSize || '';
    return {
      requestId: r._id,
      _id: r._id,
      orderId: r.orderId,
      orderItemId: r.orderItemId,
      userName: customerName(u),
      userMobile: u.mobile || '',
      user: r.user,
      productName: r.productTitle,
      productImage: r.productImage || '',
      selectedSize: storedSize || sizeMap[String(r.orderItemId)] || '',
      reason: r.reason,
      description: r.description,
      images: r.images || [],
      status: toLabel(RETURN_STATUS_MAP, r.status),
      rawStatus: r.status,
      adminNote: r.adminNotes || '',
      refundAmount: r.refundAmount,
      refundMethod: r.refundMethod,
      refundStatus: getRefundStatus(r.status),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  });

  return {
    success: true,
    data,
    total,
    totalPages,
    pagination: {
      total,
      totalPages,
      currentPage: page,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};

const adminPayExchange = async (req) => {
  const { id } = req.params;
  const exchange = await Exchange.findById(id);
  if (!exchange) throw new ApiError(httpStatus.NOT_FOUND, 'Exchange request not found');
  if (exchange.status !== 'payment_pending') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Exchange is not awaiting payment');
  }
  exchange.status = 'payment_completed';
  exchange.paymentId = exchange.paymentId || `admin_${Date.now()}`;
  exchange.paymentOrderId = exchange.paymentOrderId || `admin_order_${Date.now()}`;
  await exchange.save();
  return exchange;
};

const adminProcessRefund = async (req) => {
  const { id } = req.params;
  const { method, amount } = req.body;

  const returnReq = await Return.findById(id);
  if (!returnReq) throw new ApiError(httpStatus.NOT_FOUND, 'Return request not found');

  returnReq.status = 'refund_initiated';
  if (method) returnReq.refundMethod = method;
  if (amount !== undefined) returnReq.refundAmount = amount;
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
  getAdminExchanges,
  getAdminReturns,
  adminPayExchange,
  adminProcessRefund,
};
