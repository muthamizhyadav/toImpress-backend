const mongoose = require('mongoose');
const { v4 } = require('uuid');

const productSchema = mongoose.Schema(
  {
    _id: {
      type: String,
      default: v4,
    },
    productTitle: {
      type: String,
      trime: true,
    },
    productDescription: {
      type: String,
      trime: true,
    },
    price: {
      type: Number,
    },
    salePrice: {
      type: Number,
    },
    selectedColors: {
      type: Array,
      default: [],
    },
    selectedSizes: {
      type: Array,
      default: [],
    },
    stockQuantity: {
      type: Number,
    },
    category: {
      type: String,
      trime: true,
    },
    Descriptionimages: {
      type: Array,
      default: [],
    },
    stockStatus: {
      type: String,
      trime: true,
    },
    images: {
      type: Array,
      default: [],
    },
    colorData:{
      type: Object,
      default: {},
    }
  },
  { timestamp: true }
);
const Product = mongoose.model('products', productSchema);

module.exports = Product;
