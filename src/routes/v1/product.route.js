const express = require('express');
const router = express.Router();
const { productController } = require('../../controllers');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.route('/').post(productController.createProduct).get(productController.getProducts);
router.route('/multiple/file/upload').post(upload.array('files'), productController.uploadMultipleFiles);
router.route('/:id').get(productController.getProductById).put(productController.updateProductById);
router.route('/products/by/categories/:id').get(productController.productsByCategories);
router.route('/product/detail/:id').get(productController.getProductByIdAndSimilerProducts);




module.exports = router;
