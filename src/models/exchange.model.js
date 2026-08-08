const mongoose = require('mongoose');
const { v4 } = require('uuid');
const { toJSON, paginate } = require('./plugins');

const exchangeSchema = mongoose.Schema(
  {
    _id: { type: String, default: v4 },
    user: { type: String, required: true },
    orderId: { type: String, required: true },
    orderItemId: { type: String, required: true },
    product: { type: String, required: true },
    productTitle: { type: String, required: true },
    productImage: { type: String },
    currentSize: { type: String, default: '' },
    newSize: { type: String, required: true },
    reason: {
      type: String,
      required: true,
      enum: ['Size Too Small', 'Size Too Large', 'Defective Product', 'Wrong Product Received', 'Other'],
    },
    description: { type: String, trim: true },
    images: [{ type: String }],
    status: {
      type: String,
      enum: ['requested', 'under_review', 'approved', 'rejected', 'payment_pending', 'payment_completed', 'pickup_scheduled', 'product_received', 'replacement_dispatched', 'exchange_completed'],
      default: 'requested',
    },
    paymentId: { type: String },
    paymentOrderId: { type: String },
    processingCharge: { type: Number, default: 150 },
    adminNotes: { type: String, trim: true },
  },
  { timestamps: true }
);

exchangeSchema.plugin(toJSON);
exchangeSchema.plugin(paginate);

const Exchange = mongoose.model('Exchange', exchangeSchema);
module.exports = Exchange;
