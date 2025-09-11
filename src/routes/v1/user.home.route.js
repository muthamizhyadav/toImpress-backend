const express = require('express');
const router = express.Router();
const { userHomeController } = require('../../controllers');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.route('/banner')
	.post(upload.single('image'), userHomeController.createBanner)
	.get(userHomeController.getAllBanners);

router.route('/banner/:id')
	.delete(userHomeController.deleteBannerById);
module.exports = router;
