const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { categoryService } = require('../services');

const createCategory = catchAsync(async (req, res) => {
  const category = await categoryService.createCategory(req);
  res.status(httpStatus.CREATED).send(category);
});

const fetchAllCategory = catchAsync(async (req, res) => {
  const category = await categoryService.fetchAllCategory(req);
  res.status(httpStatus.OK).send(category);
});

const deleteCategory = catchAsync(async (req, res) => {
  const category = await categoryService.deleteCategory(req);
  res.status(httpStatus.OK).send(category);
});

const updateCategory = catchAsync(async (req, res) => {
  const category = await categoryService.updateCategory(req);
  res.status(httpStatus.OK).send(category);
});

module.exports = {
  createCategory,
  fetchAllCategory,
  deleteCategory,
  updateCategory,
};
