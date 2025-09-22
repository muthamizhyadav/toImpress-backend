const mongoose = require('mongoose');
const { v4 } = require('uuid');
const { toJSON, paginate } = require('./plugins');

const orderItemSchema = mongoose.Schema({
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
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  selectedColor: {
    type: String,
  },
  selectedSize: {
    type: String,
  },
  subtotal: {
    type: Number,
    required: true,
  },
  productUrl:String,
});

const shippingAddressSchema = mongoose.Schema({
  street: {
    type: String,
    required: true,
    trim: true,
  },
  city: {
    type: String,
    required: true,
    trim: true,
  },
  state: {
    type: String,
    required: true,
    trim: true,
  },
  zip: {
    type: String,
    required: true,
    trim: true,
  },
  country: {
    type: String,
    required: true,
    trim: true,
  },
});

const orderSchema = mongoose.Schema(
  {
    _id: {
      type: String,
      default: v4,
    },
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    user: {
      type: String,
    },
    items: [orderItemSchema],
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      default: 'pending',
    },
    paymentMethod: {
      type: String,
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    billingAddress: {
      type: shippingAddressSchema,
    },
    notes: {
      type: String,
      trim: true,
    },
    trackingNumber: {
      type: String,
      trim: true,
    },
    shippingCost: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    estimatedDelivery: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Add plugin that converts mongoose to json
orderSchema.plugin(toJSON);
orderSchema.plugin(paginate);

// Generate order number before saving
orderSchema.pre('save', async function (next) {
  if (this.isNew) {
    const count = await this.constructor.countDocuments();
    this.orderNumber = `ORD-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Calculate total amount before saving
orderSchema.pre('save', function (next) {
  if (this.items && this.items.length > 0) {
    const itemsTotal = this.items.reduce((total, item) => total + item.subtotal, 0);
    this.totalAmount = itemsTotal + this.shippingCost + this.tax - this.discount;
  }
  next();
});

// Calculate subtotal for each item
orderItemSchema.pre('save', function (next) {
  this.subtotal = this.price * this.quantity;
  next();
});

/**
 * @typedef Order
 */
const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
