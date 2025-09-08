const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { orderService } = require('../services');

const createOrder = catchAsync(async (req, res) => {
  const order = await orderService.createOrder(req);
  res.status(httpStatus.CREATED).send({
    success: true,
    message: 'Order created successfully',
    data: order,
  });
});

const getOrders = catchAsync(async (req, res) => {
  const result = await orderService.queryOrders(req);
  res.status(httpStatus.OK).send(result);
});

const getOrder = catchAsync(async (req, res) => {
  const order = await orderService.getOrderById(req);
  res.status(httpStatus.OK).send({
    success: true,
    data: order,
  });
});

const updateOrder = catchAsync(async (req, res) => {
  const order = await orderService.updateOrderById(req);
  res.status(httpStatus.OK).send({
    success: true,
    message: 'Order updated successfully',
    data: order,
  });
});

const deleteOrder = catchAsync(async (req, res) => {
  await orderService.deleteOrderById(req);
  res.status(httpStatus.OK).send({
    success: true,
    message: 'Order deleted successfully',
  });
});

const getUserOrders = catchAsync(async (req, res) => {
  const result = await orderService.getUserOrders(req);
  res.status(httpStatus.OK).send(result);
});

const getOrderStats = catchAsync(async (req, res) => {
  const stats = await orderService.getOrderStats();
  res.status(httpStatus.OK).send({
    success: true,
    data: stats,
  });
});

module.exports = {
  createOrder,
  getOrders,
  getOrder,
  updateOrder,
  deleteOrder,
  getUserOrders,
  getOrderStats,
};
