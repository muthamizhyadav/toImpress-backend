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
  const productSearchQuery = req.query.searchkey || '';

  if (productSearchQuery) {
    productSearch = {
      productTitle: { $regex: productSearchQuery, $options: 'i' },
    };
  }

  const result = await Product.aggregate([
    { $match: productSearch },
    {
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }],
        totalCount: [{ $count: 'count' }],
      },
    },
  ]);

  const products = result[0]?.data || [];
  const total = result[0]?.totalCount[0]?.count || 0;
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
  const userId = req.user?.id || null;

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

  const findProductsByCategory = await Product.aggregate([
    { $match: { category: name } },

    {
      $lookup: {
        from: 'carts',
        let: { productId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$product', '$$productId'] }, { $eq: ['$user', userId] }],
              },
            },
          },
        ],
        as: 'cart',
      },
    },

    { $skip: skip },
    { $limit: limit },
  ]);

  const totalCountAgg = await Product.aggregate([
    { $match: { category: name } },
    {
      $lookup: {
        from: 'carts',
        let: { productId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$product', '$$productId'] }, { $eq: ['$user', userId] }],
              },
            },
          },
        ],
        as: 'cart',
      },
    },
    { $count: 'total' },
  ]);

  const totalCount = totalCountAgg.length > 0 ? totalCountAgg[0].total : 0;

  return {
    data: findProductsByCategory,
    currentPage: page,
    totalPages: Math.ceil(totalCount / limit),
    totalItems: totalCount,
  };
};

const getProductsByCategory = async (req) => {
  const categoryName = req.params.categoryName || req.query.category;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  if (!categoryName) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Category name is required');
  }

  const products = await Product.find({ category: categoryName }).skip(skip).limit(limit);
  const total = await Product.countDocuments({ category: categoryName });
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

const getProductByIdAndSimilerProducts = async (req) => {
  const id = req.params.id;
  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }
  const similarProducts = await Product.find({
    category: product.category,
    _id: { $ne: id },
  }).limit(4);
  return {
    product,
    similarProducts,
  };
};

const deleteProductById = async (id) => {
  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }
  await product.deleteOne();
  return { success: true, message: 'Product deleted successfully' };
};

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
};
