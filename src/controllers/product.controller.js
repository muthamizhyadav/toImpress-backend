const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const ProductService = require('../services/product.service');

const uploadMultipleFiles = catchAsync(async (req, res) => {
  const data = await ProductService.uploadMultipleFiles(req);
  res.status(httpStatus.CREATED).send(data);
});

const createProduct = catchAsync(async (req, res) => {
  const data = await ProductService.createProduct(req);
  res.status(httpStatus.CREATED).send(data);
});

module.exports = {
  uploadMultipleFiles,
  createProduct,
};
