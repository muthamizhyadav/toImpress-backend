const mongoose = require('mongoose');
const { v4 } = require('uuid');
const { toJSON, paginate } = require('./plugins');

const cartSchema = mongoose.Schema(
  {
    _id: {
      type: String,
      default: v4,
    },
    user: {
      type: String,
      ref: 'User',
      required: true,
      unique: true,
    },
    product: {
      type: String,
      required: false,
    },
    itemqty: {
      type: Number,
      required: false,
      min: 0,
      default: 0,
    },
    image: {
      type: String,
    },
    selectedSize: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
cartSchema.plugin(toJSON);
cartSchema.plugin(paginate);

// Index for better performance
cartSchema.index({ user: 1 });

// Calculate totals before saving
cartSchema.pre('save', function (next) {
  this.totalAmount = this.subtotal || 0;
  next();
});

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;