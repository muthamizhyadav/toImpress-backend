const mongoose = require('mongoose');
const { v4 } = require('uuid');
const { toJSON, paginate } = require('./plugins');

const returnSchema = mongoose.Schema(
  {
    _id: { type: String, default: v4 },
    user: { type: String, required: true },
    orderId: { type: String, required: true },
    orderItemId: { type: String, required: true },
    product: { type: String, required: true },
    productTitle: { type: String, required: true },
    productImage: { type: String },
    reason: {
      type: String,
      required: true,
      enum: ['Damaged Product', 'Wrong Product Received', 'Quality Issue', 'Other'],
    },
    description: { type: String, trim: true },
    images: [{ type: String }],
    status: {
      type: String,
      enum: ['requested', 'under_review', 'approved', 'rejected', 'pickup_scheduled', 'product_received', 'quality_inspection', 'refund_initiated', 'refund_credited', 'return_completed'],
      default: 'requested',
    },
    refundAmount: { type: Number },
    refundMethod: { type: String },
    refundTransactionId: { type: String },
    adminNotes: { type: String, trim: true },
  },
  { timestamps: true }
);

returnSchema.plugin(toJSON);
returnSchema.plugin(paginate);

const Return = mongoose.model('Return', returnSchema);
module.exports = Return;
