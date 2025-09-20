const mongoose = require('mongoose');
const { v4 } = require('uuid');
const { toJSON, paginate } = require('./plugins');

const cartItemSchema = mongoose.Schema({
  product: {
    type: String,
    required: true,
  },
  productTitle: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  salePrice: {
    type: Number,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  selectedColor: {
    type: String,
  },
  selectedImage:{
    type:String
  },
  selectedSize: {
    type: String,
  },
  subtotal: {
    type: Number,
    required: true,
  },
  image: {
    type: String,
  },
});

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
    items: [cartItemSchema],
    totalAmount: {
      type: Number,
      default: 0,
    },
    itemCount: {
      type: Number,
      default: 0,
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
  this.itemCount = this.items.length;
  this.totalAmount = this.items.reduce((total, item) => total + item.subtotal, 0);
  next();
});

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;