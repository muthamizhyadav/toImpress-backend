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

cartSchema.plugin(toJSON);
cartSchema.plugin(paginate);

cartSchema.index({ user: 1 });

cartSchema.pre('save', function (next) {
  this.totalAmount = this.subtotal || 0;
  next();
});

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;