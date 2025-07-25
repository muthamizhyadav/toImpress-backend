const httpStatus = require('http-status');
const { Category, Product } = require('../models');
const ApiError = require('../utils/ApiError');
const { uploadMultipleToR2 } = require('../utils/multipleUpload');

const uploadMultipleFiles = async (req) => {
  if (req.files) {
    const uploaded = await uploadMultipleToR2(req.files, 'product');
    return uploaded;
  } else {
    throw new ApiError(httpStatus.BAD_REQUEST, 'files required to upload');
  }
};

const createProduct = async (req) => {
  const body = req.body;
  const creation = await Product.create(body);
  return creation;
};

const getProducts = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const filter = {};
  const sort = { createdAt: -1 };
  if (req.query.category) {
    filter.category = req.query.category;
  }
  if (req.query.sortBy) {
    const sortFields = req.query.sortBy.split(':');
    sort[sortFields[0]] = sortFields[1] === 'desc' ? -1 : 1;
  }
  const products = await Product.find(filter).sort(sort).skip(skip).limit(limit);
  const total = await Product.countDocuments(filter);
  const totalPages = Math.ceil(total / limit);

  return {
    success: true,
    data: products,
    pagination: {
      total,
      totalPages,
      currentPage: page,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};

const getProductById = async (req) => {
  const id = req.params.id;
  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }
  return product;
};

const updateProductById = async (req) => {
  const id = req.params.id;
  const updateData = req.body;

  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }
  Object.assign(product, updateData);
  await product.save();
  return product;
};

const productsByCategories = async (req) => {
  const id = parseInt(req.params.id);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  let name;
  switch (id) {
    case 1:
      name = 'Brassiere';
      break;
    case 2:
      name = 'Panties';
      break;
    case 3:
      name = 'Shimmer Leggings';
      break;
    case 4:
      name = 'New Arrivals';
      break;
    case 5:
      name = 'Offers Zone';
      break;
    case 6:
      name = 'Combo';
      break;
    default:
      name = null;
  }

  if (!name) return [];

  const findProductsByCategory = await Product.find({ category: name }).skip(skip).limit(limit);

  const totalCount = await Product.countDocuments({ category: name });

  return {
    data: findProductsByCategory,
    currentPage: page,
    totalPages: Math.ceil(totalCount / limit),
    totalItems: totalCount,
  };
};

const getProductByIdAndSimilerProducts = async (req) => {
  const id = req.params.id;
  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }
  const getSimilerProduct = await Product.find({ category: product.category }).limit(10);
  return {
    detail: product,
    similerProducts: getSimilerProduct,
  };
};

module.exports = {
  uploadMultipleFiles,
  createProduct,
  getProducts,
  getProductById,
  updateProductById,
  productsByCategories,
  getProductByIdAndSimilerProducts
};
