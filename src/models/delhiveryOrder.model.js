const mongoose = require('mongoose');

const delhiveryOrderSchema = new mongoose.Schema({
    _id:{ type: String, default: require('uuid').v4 },
  waybill: { type: String, required: true, unique: true },
  orderId: { type: String, required: true },
  refnum: { type: String },
  status: { type: String },
  client: { type: String },
  sort_code: { type: String },
  remarks: [{ type: String }],
  cod_amount: { type: Number },
  userId:{ type: String},
  payment: { type: String },
  serviceable: { type: Boolean },
  shipmentPayload: { type: Object },
  responsePayload: { type: Object },
  createdAt: { type: Date, default: Date.now },
  isOnlinePayment:{ type: Boolean, default:false}
});

const DelhiveryOrder = mongoose.model('DelhiveryOrder', delhiveryOrderSchema);

module.exports = DelhiveryOrder;
