const Razorpay = require('razorpay');
const crypto = require('crypto');
const RazorPayModel = require('../models/razorpayOrder.model');
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const { RazorpayOrder, Order, User } = require('../models');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');
const axios = require('axios');

const createRazorpayOrder = async ({ amount, currency = 'INR', receipt, notes, items, localOrderId }, userId) => {
  try {
    if (!localOrderId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Local order ID is required');
    }

    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt,
      notes,
    });

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
      order: localOrderId,
    });
    return order;
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    throw error;
  }
};

// const verifyRazorpaySignature = async ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
//   const body = razorpay_order_id + '|' + razorpay_payment_id;
//   let checkPaymentStatus = await getPaymentStatusByOrderId(razorpay_order_id);
//   if (checkPaymentStatus) {
//     const RZOrders = await RazorPayModel.findOne({ orderId: razorpay_order_id });
//     if (RZOrders) {
//       const findOrders = await Order.findOne({ _id: RZOrders.order });
//       if (findOrders) {
//         const user = await User.findOne({ _id: findOrders.user });
//         console.log(user,"USER");
//         await axios.post('https://api.convobox.in/api/templates/webhooks/855353833790259/923351424193528', {
//           receiver: `91${user.mobile}`,
//           media_url: `${findOrders.items && findOrders.items.length > 0 ? findOrders.items[0].image : ''}`,
//           values: {
//             'Body_{{1}}': 'Your order has been placed successfully',
//           },
//         });
//       }
//     }
//     await RazorPayModel.findOneAndUpdate({ orderId: razorpay_order_id }, { status: checkPaymentStatus.status });
//   }
//   const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
//   return expectedSignature === razorpay_signature;
// };
const verifyRazorpaySignature = async ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
  const body = `${razorpay_order_id}|${razorpay_payment_id}`;

  const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');

  // ❌ Stop if signature mismatch
  if (expectedSignature !== razorpay_signature) {
    return false;
  }

  const checkPaymentStatus = await getPaymentStatusByOrderId(razorpay_order_id);
  if (!checkPaymentStatus) return false;

  const rzOrder = await RazorPayModel.findOne({ orderId: razorpay_order_id });
  if (!rzOrder) return false;

  const order = await Order.findById(rzOrder.order);
  if (!order) return false;

  const user = await User.findById(order.user);
  if (!user || !user.mobile) return false;

  // ✅ Update payment status
  await RazorPayModel.findOneAndUpdate({ orderId: razorpay_order_id }, { status: checkPaymentStatus.status });

  const FALLBACK_IMAGE = 'https://yourcdn.com/default-order-success.jpg';

  const imageUrl =
    order.items?.[0]?.productUrl && order.items[0].productUrl.startsWith('https') ? order.items[0].productUrl : FALLBACK_IMAGE;

  const payload = {
    receiver: `91${user.mobile}`,
    media_url: imageUrl,
    values: {
      'Body_{{1}}': 'Your order has been placed successfully',
    },
  };
  console.log(order,user,"DETAILS");
  
  try {
    await axios.post('https://api.convobox.in/api/templates/webhooks/855353833790259/923351424193528', payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  } catch (error) {
    console.error('❌ ConvoBox Status:', error.response?.status);
    console.error('❌ ConvoBox Data:', error.response?.data);
    console.error('❌ ConvoBox Message:', error.message);
    throw error;
  }

  return true;
};

const getPaymentStatusByOrderId = async (orderId) => {
  try {
    const payments = await razorpay.orders.fetchPayments(orderId);

    if (!payments.items || payments.items.length === 0) {
      return { success: false, message: 'No payments found for this order' };
    }
    const payment = payments.items[0];
    return {
      success: true,
      payment_id: payment.id,
      status: payment.status,
      method: payment.method,
      amount: payment.amount / 100,
      currency: payment.currency,
      email: payment.email,
      contact: payment.contact,
      created_at: payment.created_at,
    };
  } catch (error) {
    console.error('Error fetching payment status by orderId:', error);
    throw error;
  }
};

const getPaymentStatusByReceipt = async (receipt) => {
  try {
    const orders = await razorpay.orders.all({ receipt });
    if (!orders.items || orders.items.length === 0) {
      return { success: false, message: 'Order not found for this receipt' };
    }
    const order = orders.items[0];
    let paymentStatus = await getPaymentStatusByOrderId(order.id);
    if (paymentStatus.payment_id) {
      await RazorPayModel.findOneAndUpdate({ orderId: order.id }, { status: paymentStatus.status });
    }
    console.log('paymentStatus', paymentStatus);
    return paymentStatus;
  } catch (error) {
    console.error('Error fetching payment status by receipt:', error);
    throw error;
  }
};

module.exports = {
  createRazorpayOrder,
  verifyRazorpaySignature,
  getPaymentStatusByReceipt,
};
