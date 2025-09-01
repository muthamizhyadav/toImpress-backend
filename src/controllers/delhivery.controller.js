const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const delhiveryService = require('../services/delhivery.service');

const createShipment = catchAsync(async (req, res) => {
  const result = await delhiveryService.createShipment(req.body);
  res.status(httpStatus.OK).json(result);
});

const trackShipment = catchAsync(async (req, res) => {
  const { waybill } = req.query;
  const result = await delhiveryService.trackShipment(waybill);
  res.status(httpStatus.OK).json(result);
});

module.exports = {
  createShipment,
  trackShipment,
};
