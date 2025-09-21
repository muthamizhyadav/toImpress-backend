const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});


const { RazorpayOrder } = require('../models');

const createRazorpayOrder = async ({ amount, currency = 'INR', receipt, notes,items },userId) => {
  try {
    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt,
      notes,
    });

    // Store in MongoDB
    await RazorpayOrder.create({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      notes: order.notes,
      status: order.status,
      raw: order,
      items: items || [],
      userId: userId || null,
    });

    return order;
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    throw error;
  }
};

const verifyRazorpaySignature = async ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');
  return expectedSignature === razorpay_signature;
};

module.exports = {
  createRazorpayOrder,
  verifyRazorpaySignature,
};
