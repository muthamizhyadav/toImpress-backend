const mongoose = require('mongoose');
const { v4 } = require('uuid');

const categorySchema = mongoose.Schema(
  {
    _id: {
      type: String,
      default: v4,
    },
    categoryTitle: {
      type: String,
    },
    imageUrl: {
      type: String,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamp: true }
);

const Category = mongoose.model('category', categorySchema);

module.exports = Category