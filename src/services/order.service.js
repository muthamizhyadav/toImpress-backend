const httpStatus = require('http-status');
const { Order, Product, User } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create an order
 * @param {Object} orderBody
 * @returns {Promise<Order>}
 */
const createOrder = async (req) => {
  const { items, shippingAddress, billingAddress, paymentMethod, notes, shippingCost, tax, discount } = req.body;
  const userId = req.user.id;

  // Validate user exists
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Validate products and calculate totals
  const validatedItems = [];
  let totalAmount = 0;
  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) {
      throw new ApiError(httpStatus.NOT_FOUND, `Product with id ${item.product} not found`);
    }

    // Check stock availability
    if (product.stockQuantity < item.quantity) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Insufficient stock for product ${product.productTitle}`);
    }

    const price = product.salePrice || product.price;
    const subtotal = price * item.quantity;
    totalAmount += subtotal;

    validatedItems.push({
      product: item.product,
      productTitle: product.productTitle,
      price,
      quantity: item.quantity,
      selectedColor: item.selectedColor,
      selectedSize: item.selectedSize,
      subtotal,
      productUrl: item.productUrl,
    });
  }

  totalAmount += (shippingCost || 0) + (tax || 0) - (discount || 0);

  const shipAddr = Array.isArray(shippingAddress) ? shippingAddress[0] : shippingAddress;
  const billAddr = billingAddress ? (Array.isArray(billingAddress) ? billingAddress[0] : billingAddress) : shipAddr;

  const orderNumber = `ORD${Date.now()}`;

  const orderData = {
    orderNumber,
    user: userId,
    items: validatedItems,
    totalAmount,
    shippingAddress: shipAddr,
    billingAddress: billAddr,
    paymentMethod,
    notes,
    shippingCost: shippingCost || 0,
    tax: 0,
    discount: discount || 0,
  };

  const order = await Order.create(orderData);

  // Update product stock quantities
  for (const item of items) {
    await Product.findByIdAndUpdate(item.product, { $inc: { stockQuantity: -item.quantity } }, { new: true });
  }

  return await Order.findById(order._id).populate('user', 'name email').populate('items.product');
};

/**
 * Query for orders
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryOrders = async (req) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const filter = {};
  const sort = { createdAt: -1 };

  // Apply filters
  if (req.query.status) {
    filter.status = req.query.status;
  }
  if (req.query.paymentStatus) {
    filter.paymentStatus = req.query.paymentStatus;
  }
  if (req.query.userId) {
    filter.user = req.query.userId;
  }
  if (req.user.role !== 'admin') {
    // Non-admin users can only see their own orders
    filter.user = req.user.id;
  }

  if (req.query.sortBy) {
    const sortFields = req.query.sortBy.split(':');
    sort[sortFields[0]] = sortFields[1] === 'desc' ? -1 : 1;
  }

  const orders = await Order.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('user', 'name email')
    .populate('items.product');

  const total = await Order.countDocuments(filter);
  const totalPages = Math.ceil(total / limit);

  return {
    success: true,
    data: orders,
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

/**
 * Get order by id
 * @param {ObjectId} id
 * @returns {Promise<Order>}
 */
const getOrderById = async (req) => {
  const { id } = req.params;
  const order = await Order.findById(id).populate('user', 'name email').populate('items.product');

  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  // Check if user can access this order
  if (req.user.role !== 'admin' && order.user._id !== req.user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied');
  }

  return order;
};

/**
 * Update order by id
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<Order>}
 */
const updateOrderById = async (req) => {
  const { id } = req.params;
  const updateBody = req.body;

  const order = await getOrderById(req);

  // Validate status transitions
  const validTransitions = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: [],
  };

  if (updateBody.status && !validTransitions[order.status].includes(updateBody.status)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid status transition from ${order.status} to ${updateBody.status}`);
  }

  if (updateBody.status === 'delivered') {
    updateBody.deliveredAt = new Date();
  }

  Object.assign(order, updateBody);
  await order.save();

  return await Order.findById(order._id).populate('user', 'name email').populate('items.product');
};

/**
 * Delete order by id
 * @param {ObjectId} id
 * @returns {Promise<Order>}
 */
const deleteOrderById = async (req) => {
  const { id } = req.params;
  const order = await getOrderById(req);

  // Only allow deletion of pending or cancelled orders
  if (!['pending', 'cancelled'].includes(order.status)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Only pending or cancelled orders can be deleted');
  }

  // Restore product stock quantities
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, { $inc: { stockQuantity: item.quantity } }, { new: true });
  }

  await Order.findByIdAndDelete(id);
  return order;
};

/**
 * Get user's orders
 * @param {ObjectId} userId
 * @returns {Promise<Order[]>}
 */
const getUserOrders = async (req) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const filter = { user: userId };
  const sort = { createdAt: -1 };  
  if (req.query.status) {
    filter.status = req.query.status;
  }

  const orders = await Order.aggregate([
    {
      $match:{user: userId}
    },
    {
      $lookup: {
        from: 'delhiveryorders',
        localField: '_id',
        foreignField: 'orderId',
        as: 'delhiveryDetails',
      },
    },
    {
      $unwind: { path: '$delhiveryDetails',preserveNullAndEmptyArrays: true},
    },
    { $sort: sort },
    { $skip: skip },
    { $limit: limit },
  ]);

  const total = await Order.aggregate([
    {
      $match:{user: userId}
    },
    {
      $lookup: {
        from: 'delhiveryorders',
        localField: '_id',
        foreignField: 'orderId',
        as: 'delhiveryDetails',
      },
    },
    {
      $unwind: { path: '$delhiveryDetails' },
    },
  ])

  const totalPages = Math.ceil(total.length / limit);
  const Total = total.length;

  return {
    success: true,
    data: orders,
    pagination: {
      total:Total,
      totalPages,
      currentPage: page,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};

/**
 * Get order statistics
 * @returns {Promise<Object>}
 */
const getOrderStats = async () => {
  const stats = await Order.aggregate([
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
        averageOrderValue: { $avg: '$totalAmount' },
      },
    },
  ]);

  const statusStats = await Order.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  return {
    overall: stats[0] || { totalOrders: 0, totalRevenue: 0, averageOrderValue: 0 },
    byStatus: statusStats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {}),
  };
};

module.exports = {
  createOrder,
  queryOrders,
  getOrderById,
  updateOrderById,
  deleteOrderById,
  getUserOrders,
  getOrderStats,
};
