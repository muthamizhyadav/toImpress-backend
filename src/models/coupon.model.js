const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const couponSchema = new mongoose.Schema({
    _id:{
        type: String,
        default: require('uuid').v4,
        unique: true
    },
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        minlength: 3,
        maxlength: 20
    },
    discount: {
        type: Number,
        required: true,
        min: 0
    },
    type: {
        type: String,
    },
    couponFor: {
        type: String,
        required: true,
    },
    products: {
        type:Array,
        default: []
    },
    minPurchaseAmount: {
        type: Number,
        min: 0,
        required: function() {
            return this.couponFor === 'minPurchase';
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    usageCount: {
        type: Number,
        default: 0
    },
    maxUsage: {
        type: Number,
        default: null // null means unlimited usage
    }
}, {
    timestamps: true
});

// Add plugins
couponSchema.plugin(toJSON);
couponSchema.plugin(paginate);

// Validation middleware
couponSchema.pre('save', function(next) {
    // For percentage discounts, ensure discount is not more than 100%
    if (this.type === 'percentage' && this.discount > 100) {
        const err = new Error('Percentage discount cannot be more than 100%');
        return next(err);
    }
    
    // For product coupons, ensure products array is not empty if specified
    if (this.couponFor === 'product' && this.products && this.products.length === 0) {
        // Allow empty products array for global product coupons
    }
    
    // For minPurchase coupons, ensure minPurchaseAmount is provided
    if (this.couponFor === 'minPurchase' && !this.minPurchaseAmount) {
        const err = new Error('Minimum purchase amount is required for minimum purchase coupons');
        return next(err);
    }
    
    next();
});

// Static methods
couponSchema.statics.isCodeTaken = async function (code, excludeCouponId) {
    const coupon = await this.findOne({ code, _id: { $ne: excludeCouponId } });
    return !!coupon;
};

// Index for faster queries
couponSchema.index({ code: 1 });
couponSchema.index({ isActive: 1 });
couponSchema.index({ couponFor: 1 });

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
