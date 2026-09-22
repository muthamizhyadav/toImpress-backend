const express = require('express');

const router = express.Router();
const multer = require('multer');
const { userHomeController } = require('../../controllers');

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.route('/banner').post(upload.single('image'), userHomeController.createBanner).get(userHomeController.getAllBanners);

router.route('/banner/bulk-order').put(userHomeController.bulkUpdatePosition);

router
  .route('/banner/:id')
  .put(upload.single('image'), userHomeController.updateBannerById)
  .delete(userHomeController.deleteBannerById);
module.exports = router;
