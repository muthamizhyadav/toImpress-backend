const Joi = require('joi');

const createRazorpayOrder = {
  body: Joi.object().keys({
    amount: Joi.number().integer().min(1).required(),
    currency: Joi.string().default('INR'),
    receipt: Joi.string().optional(),
    notes: Joi.object().optional(),
    localOrderId: Joi.string().optional(),
  }),
};

const verifyRazorpaySignature = {
  body: Joi.object().keys({
    razorpay_order_id: Joi.string().required(),
    razorpay_payment_id: Joi.string().required(),
    razorpay_signature: Joi.string().required(),
  }),
};

module.exports = {
  createRazorpayOrder,
  verifyRazorpaySignature,
};
