const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { exchangeReturnService } = require('../services');

const downloadImage = catchAsync(async (req, res) => {
  const { url } = req.query;
  if (!url || !/^https?:\/\/.+/.test(url)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Valid image url is required');
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new ApiError(response.status, 'Failed to fetch image from source');
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') || 'application/octet-stream';
  const filename = `image-${Date.now()}.jpg`;
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
});

const createExchange = catchAsync(async (req, res) => {
  const exchange = await exchangeReturnService.createExchange(req);
  res.status(httpStatus.CREATED).send({ success: true, message: 'Exchange request submitted', data: exchange });
});

const getMyExchanges = catchAsync(async (req, res) => {
  const result = await exchangeReturnService.getMyExchanges(req);
  res.status(httpStatus.OK).send(result);
});

const getExchange = catchAsync(async (req, res) => {
  const exchange = await exchangeReturnService.getExchangeById(req);
  res.status(httpStatus.OK).send({ success: true, data: exchange });
});

const updateExchangeStatus = catchAsync(async (req, res) => {
  const exchange = await exchangeReturnService.updateExchangeStatus(req);
  res.status(httpStatus.OK).send({ success: true, message: 'Exchange status updated', data: exchange });
});

const payExchangeCharge = catchAsync(async (req, res) => {
  const exchange = await exchangeReturnService.payExchangeCharge(req);
  res.status(httpStatus.OK).send({ success: true, message: 'Payment recorded', data: exchange });
});

const createReturn = catchAsync(async (req, res) => {
  const returnReq = await exchangeReturnService.createReturn(req);
  res.status(httpStatus.CREATED).send({ success: true, message: 'Return request submitted', data: returnReq });
});

const getMyReturns = catchAsync(async (req, res) => {
  const result = await exchangeReturnService.getMyReturns(req);
  res.status(httpStatus.OK).send(result);
});

const getAdminExchanges = catchAsync(async (req, res) => {
  const result = await exchangeReturnService.getAdminExchanges(req);
  res.status(httpStatus.OK).send(result);
});

const getAdminReturns = catchAsync(async (req, res) => {
  const result = await exchangeReturnService.getAdminReturns(req);
  res.status(httpStatus.OK).send(result);
});

const adminPayExchange = catchAsync(async (req, res) => {
  const exchange = await exchangeReturnService.adminPayExchange(req);
  res.status(httpStatus.OK).send({ success: true, message: 'Payment recorded', data: exchange });
});

const payReturnCharge = catchAsync(async (req, res) => {
  const returnReq = await exchangeReturnService.payReturnCharge(req);
  res.status(httpStatus.OK).send({ success: true, message: 'Payment recorded', data: returnReq });
});

const adminProcessRefund = catchAsync(async (req, res) => {
  const returnReq = await exchangeReturnService.adminProcessRefund(req);
  res.status(httpStatus.OK).send({ success: true, message: 'Refund initiated', data: returnReq });
});

const getReturn = catchAsync(async (req, res) => {
  const returnReq = await exchangeReturnService.getReturnById(req);
  res.status(httpStatus.OK).send({ success: true, data: returnReq });
});

const updateReturnStatus = catchAsync(async (req, res) => {
  const returnReq = await exchangeReturnService.updateReturnStatus(req);
  res.status(httpStatus.OK).send({ success: true, message: 'Return status updated', data: returnReq });
});

const uploadImages = catchAsync(async (req, res) => {
  const uploaded = await exchangeReturnService.uploadExchangeReturnImages(req);
  res.status(httpStatus.OK).send({ success: true, data: uploaded });
});

const scheduleExchangePickup = catchAsync(async (req, res) => {
  const result = await exchangeReturnService.scheduleExchangePickup(req);
  res.status(httpStatus.OK).send({ success: true, message: 'Reverse pickup scheduled', ...result });
});

const dispatchReplacement = catchAsync(async (req, res) => {
  const result = await exchangeReturnService.dispatchReplacement(req);
  res.status(httpStatus.OK).send({ success: true, message: 'Replacement dispatched', ...result });
});

const checkExchangeShipment = catchAsync(async (req, res) => {
  const result = await exchangeReturnService.checkExchangeShipment(req);
  res.status(httpStatus.OK).send({ success: true, ...result });
});

const scheduleReturnPickup = catchAsync(async (req, res) => {
  const result = await exchangeReturnService.scheduleReturnPickup(req);
  res.status(httpStatus.OK).send({ success: true, message: 'Return pickup scheduled', ...result });
});

const checkReturnShipment = catchAsync(async (req, res) => {
  const result = await exchangeReturnService.checkReturnShipment(req);
  res.status(httpStatus.OK).send({ success: true, ...result });
});

module.exports = {
  createExchange,
  getMyExchanges,
  getExchange,
  updateExchangeStatus,
  payExchangeCharge,
  createReturn,
  getMyReturns,
  getReturn,
  updateReturnStatus,
  uploadImages,
  getAdminExchanges,
  getAdminReturns,
  adminPayExchange,
  payReturnCharge,
  adminProcessRefund,
  scheduleExchangePickup,
  dispatchReplacement,
  checkExchangeShipment,
  scheduleReturnPickup,
  checkReturnShipment,
  downloadImage,
};
