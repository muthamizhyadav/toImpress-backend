const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const pageImpressService = require('../services/page.impression.service');


const createPageImpression = catchAsync(async (req, res) => {
  const result = await pageImpressService.createPageImpression(req.body);
  res.status(httpStatus.OK).json(result);
});

const impressPageData = catchAsync(async (req, res) => {
  const result = await pageImpressService.getPageImpressionsByCreatedDate(req);
  res.status(httpStatus.OK).json(result);
});

module.exports = {
  impressPageData,
  createPageImpression,
};
