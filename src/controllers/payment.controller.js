const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const paymentService = require('../services/payment.service');

const createRazorpayOrder = catchAsync(async (req, res) => {
  const order = await paymentService.createRazorpayOrder(req.body);
  res.status(httpStatus.OK).json(order);
});

const verifyRazorpaySignature = catchAsync(async (req, res) => {
  const valid = await paymentService.verifyRazorpaySignature(req.body);
  res.status(httpStatus.OK).json({ valid });
});

module.exports = {
  createRazorpayOrder,
  verifyRazorpaySignature,
};
