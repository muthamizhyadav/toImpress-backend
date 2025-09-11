const mongoose = require('mongoose');
const { v4 } = require('uuid');

const bannerSchema = mongoose.Schema(
  {
    _id: {
      type: String,
      default: v4,
    },
    title: {
      type: String,
    },
    description: {
      type: String,
    },
    position: Number,
    active: {
      type: Boolean,
      default: true,
    },
    url: {
      type: String,
    },
    bannerType:{
      type: String,
    }
  },
  { timestamp: true }
);

const Banner = mongoose.model('banners', bannerSchema);

module.exports = {
  Banner,
};
