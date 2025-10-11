const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const couponSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: require('uuid').v4,
    },
    code: {
      type: String,
    },
    discount: {
      type: Number,
      required: true,
      min: 0,
    },
    type: {
      type: String,
    },
    couponFor: {
      type: String,
      required: true,
    },
    products: {
      type: Array,
      default: [],
    },
    minPurchaseAmount: {
      type: Number,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    maxUsage: {
      type: Number,
      default: null,
    },
    category: {
      type: String,
    },

    offerAmount: {
      type: String,
    },
    offerDiscount: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Add plugins
couponSchema.plugin(toJSON);
couponSchema.plugin(paginate);


const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
