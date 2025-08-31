const mongoose = require('mongoose');
const { v4 } = require('uuid');
const { toJSON, paginate } = require('./plugins');

const razorpayOrderSchema = mongoose.Schema(
  {
    _id: {
      type: String,
      default: v4,
    },
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    receipt: {
      type: String,
    },
    notes: {
      type: Object,
    },
    status: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    raw: {
      type: Object,
    },
  },
  {
    timestamps: true,
  }
);

razorpayOrderSchema.plugin(toJSON);
razorpayOrderSchema.plugin(paginate);

const RazorpayOrder = mongoose.model('RazorpayOrder', razorpayOrderSchema);

module.exports = RazorpayOrder;
