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

const getProducts = catchAsync(async (req, res) => {
  const data = await ProductService.getProducts(req);
  res.status(httpStatus.OK).send(data);
});

const getProductById = catchAsync(async (req, res) => {
  const data = await ProductService.getProductById(req);
  res.status(httpStatus.OK).send(data);
});

const updateProductById = catchAsync(async (req, res) => {
  const data = await ProductService.updateProductById(req);
  res.status(httpStatus.OK).send(data);
});

const productsByCategories = catchAsync(async (req, res) => {
  const data = await ProductService.productsByCategories(req);
  res.status(httpStatus.OK).send(data);
});

const getProductByIdAndSimilerProducts = catchAsync(async (req, res) => {
  const data = await ProductService.getProductByIdAndSimilerProducts(req);
  res.status(httpStatus.OK).send(data);
});

const getProductsByCategory = catchAsync(async (req, res) => {
  const data = await ProductService.getProductsByCategory(req);
  res.status(httpStatus.OK).send(data);
});

const deleteProductById = catchAsync(async (req, res) => {
  const data = await ProductService.deleteProductById(req.params.id);
  res.status(httpStatus.OK).send(data);
});

const getProductsByCategoryId = catchAsync(async (req, res) => {
  const data = await ProductService.getProductsByCategoryId(req);
  res.status(httpStatus.OK).send(data);
});

const getProductSearch = catchAsync(async (req, res) => {
  const data = await ProductService.getProductSearch(req);
  res.status(httpStatus.OK).send(data);
});

const getProductSize = catchAsync(async (req, res) => {
  const productSize = req.query.size;
  if (!productSize) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Size query parameter is required');
  }
  const data = await ProductService.getProductSize(productSize);
  res.status(httpStatus.OK).send(data);
});

module.exports = {
  uploadMultipleFiles,
  createProduct,
  getProducts,
  getProductById,
  updateProductById,
  productsByCategories,
  getProductByIdAndSimilerProducts,
  deleteProductById,
  getProductsByCategory,
  getProductsByCategoryId,
  getProductSearch,
  getProductSize
};
