const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const REWARD_TYPES = [
  'percent_discount',
  'flat_discount',
  'threshold_discount',
  'free_shipping',
  'coupon',
  'points',
  'try_again',
];

const APPLIES_TO = ['all_products', 'specific_categories', 'specific_products'];

const segmentSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
    },
    rewardType: {
      type: String,
      required: true,
      enum: REWARD_TYPES,
      default: 'percent_discount',
    },
    // Reward payload: "10" for 10% off / ₹10 off, coupon code, points, etc.
    value: {
      type: String,
      default: '',
    },
    // Only used when rewardType === 'threshold_discount' (e.g. Buy ₹2000 get ₹30 off)
    minOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    color: {
      type: String,
      default: '#122F15',
    },
    // Relative weight used for the weighted pick of the winning segment
    probability: {
      type: Number,
      default: 1,
      min: 0,
    },
    // Optional mapping of this reward to a category or product
    mapType: {
      type: String,
      enum: ['none', 'category', 'product'],
      default: 'none',
    },
    categoryId: {
      type: String,
      default: '',
    },
    categoryName: {
      type: String,
      default: '',
    },
    productId: {
      type: String,
      default: '',
    },
    productName: {
      type: String,
      default: '',
    },
    winCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const spinLogSchema = new mongoose.Schema(
  {
    user: {
      type: String,
      default: '',
    },
    segmentIndex: {
      type: Number,
      default: 0,
    },
    segmentLabel: {
      type: String,
      default: '',
    },
    rewardType: {
      type: String,
      default: '',
    },
    rewardValue: {
      type: String,
      default: '',
    },
    // Set when the customer redeems this reward on an order.
    used: {
      type: Boolean,
      default: false,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    orderId: {
      type: String,
      default: '',
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    spunAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const spinnerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    // Event based spinner, e.g. "Diwali Offer", "Summer Sale"
    eventName: {
      type: String,
      default: '',
      trim: true,
    },
    appliesTo: {
      type: String,
      enum: APPLIES_TO,
      default: 'all_products',
    },
    // Set when appliesTo === 'specific_categories'
    categories: {
      type: [String],
      default: [],
    },
    // Set when appliesTo === 'specific_products'
    products: {
      type: [String],
      default: [],
    },
    // Cart value a user must reach before the wheel can be spun
    minPurchaseAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxSpinsPerUser: {
      type: Number,
      default: 1,
      min: 1,
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    spinCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    segments: {
      type: [segmentSchema],
      default: [],
    },
    spins: {
      type: [spinLogSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Add plugins
spinnerSchema.plugin(toJSON);
spinnerSchema.plugin(paginate);

const Spinner = mongoose.model('Spinner', spinnerSchema);

module.exports = Spinner;
module.exports.REWARD_TYPES = REWARD_TYPES;
module.exports.APPLIES_TO = APPLIES_TO;
