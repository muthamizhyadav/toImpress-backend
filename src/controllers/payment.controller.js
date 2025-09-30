const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const paymentService = require('../services/payment.service');

const createRazorpayOrder = catchAsync(async (req, res) => {
  console.log('Creating Razorpay order with body:', req.body, 'user:', req.user._id);
  const order = await paymentService.createRazorpayOrder(req.body,req.user._id);
  res.status(httpStatus.OK).json(order);
});

const verifyRazorpaySignature = catchAsync(async (req, res) => {
  const valid = await paymentService.verifyRazorpaySignature(req.body);
  res.status(httpStatus.OK).json({ valid });
});

const getPaymentStatusByReceipt = catchAsync(async (req, res) => {
  const { receipt } = req.params;
  const result = await paymentService.getPaymentStatusByReceipt(receipt);
  res.status(httpStatus.OK).json(result);
});

module.exports = {
  createRazorpayOrder,
  verifyRazorpaySignature,
  getPaymentStatusByReceipt
};
