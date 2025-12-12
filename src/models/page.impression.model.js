const mongoose = require('mongoose');
const { v4 } = require('uuid');

const PageImpressionSchema = mongoose.Schema(
  {
    _id: {
      type: String,
      default: v4,
    },
    pageName: {
      type: String,
      required: true,
      trim: true,
    },
    impressions: {
      type: Number,
      default: 1,
    },
    iscategoryPage: {
      type: Boolean,
      default: false,
    },
    isproductPage: {
      type: Boolean,
      default: false,
    },
    isAddToCartPage: {
      type: Boolean,
      default: false,
    },

    categoryName: {
      type: String,
    },
    productName: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

PageImpressionSchema.index({ pageName: 1 });
PageImpressionSchema.index({ iscategoryPage: 1 });
PageImpressionSchema.index({ isAddToCartPage: 1 });
PageImpressionSchema.index({ isproductPage: 1 });
PageImpressionSchema.index({ categoryName: 1 });
PageImpressionSchema.index({ productName: 1 });

PageImpressionSchema.index({ iscategoryPage: 1, categoryName: 1, createdAt: -1 });
PageImpressionSchema.index({ isproductPage: 1, productName: 1, createdAt: -1 });
PageImpressionSchema.index({ isAddToCartPage: 1, productName: 1, createdAt: -1 });



const PageImpression = mongoose.model('pageimpressions', PageImpressionSchema);




module.exports = PageImpression;
