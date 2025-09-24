const express = require('express');
const router = express.Router();
const { productController } = require('../../controllers');
const multer = require('multer');
const auth = require('../../middlewares/auth');
const { route } = require('./cart.route');
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.route('/').post(productController.createProduct).get(productController.getProducts);
router.route('/multiple/file/upload').post(upload.array('files'), productController.uploadMultipleFiles);
router.route('/:id').get(productController.getProductById).put(productController.updateProductById);
router.route('/:id')
	.get(productController.getProductById)
	.put(productController.updateProductById)
	.delete(productController.deleteProductById);
router.route('/products/by/categories/:id').get(productController.productsByCategories);
router.route('/products/category/:categoryName').get(productController.getProductsByCategory);
router.route('/by-category/:categoryId').get(productController.getProductsByCategoryId);
router.route('/product/detail/:id').get(productController.getProductByIdAndSimilerProducts);
router.route('/global/search').get(productController.getProductSearch);



module.exports = router;
