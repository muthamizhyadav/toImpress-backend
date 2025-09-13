const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const couponValidation = require('../../validations/coupon.validation');
const couponController = require('../../controllers/coupon.controller');

const router = express.Router();

router
  .route('/')
  .post(auth('manageCoupons'), couponController.createCoupon)
  .get(auth('getCoupons'), couponController.getCoupons);

router
  .route('/:couponId')
  .get(auth('getCoupons'), validate(couponValidation.getCoupon), couponController.getCoupon)
  .put(couponController.updateCoupon)
  .delete(couponController.deleteCoupon);

router
  .route('/code/:code')
  .get(auth('getCoupons'), validate(couponValidation.getCouponByCode), couponController.getCouponByCode);

router
  .route('/validate')
  .post(auth('getCoupons'), validate(couponValidation.validateCoupon), couponController.validateCoupon);

router
  .route('/apply')
  .post(auth('getCoupons'), validate(couponValidation.applyCoupon), couponController.applyCoupon);

router
  .route('/product/:productId')
  .get(auth('getCoupons'), couponController.getActiveCouponsForProduct);

router
  .route('/increment-usage')
  .post(auth('manageCoupons'), couponController.incrementUsageCount);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Coupons
 *   description: Coupon management and application
 */

/**
 * @swagger
 * /coupons:
 *   post:
 *     summary: Create a coupon
 *     description: Only admins can create coupons.
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - discount
 *               - type
 *               - couponFor
 *             properties:
 *               code:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 20
 *                 description: Unique coupon code (uppercase)
 *               discount:
 *                 type: number
 *                 minimum: 0
 *                 description: Discount amount
 *               type:
 *                 type: string
 *                 enum: [percentage, fixed]
 *                 description: Type of discount
 *               couponFor:
 *                 type: string
 *                 enum: [product, minPurchase]
 *                 description: What the coupon applies to
 *               products:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of product IDs (for product coupons)
 *               minPurchaseAmount:
 *                 type: number
 *                 minimum: 0
 *                 description: Minimum purchase amount (required for minPurchase coupons)
 *               isActive:
 *                 type: boolean
 *                 default: true
 *               maxUsage:
 *                 type: number
 *                 minimum: 1
 *                 description: Maximum usage limit (null for unlimited)
 *             example:
 *               code: "SAVE20"
 *               discount: 20
 *               type: "percentage"
 *               couponFor: "minPurchase"
 *               minPurchaseAmount: 500
 *               isActive: true
 *               maxUsage: 100
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Coupon'
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get all coupons
 *     description: Retrieve all coupons with optional filtering and pagination.
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Coupon code
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [percentage, fixed]
 *         description: Coupon type
 *       - in: query
 *         name: couponFor
 *         schema:
 *           type: string
 *           enum: [product, minPurchase]
 *         description: What the coupon applies to
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Whether coupon is active
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: sort by query in the form of field:desc/asc (ex. name:asc)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 10
 *         description: Maximum number of coupons
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Coupon'
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 totalPages:
 *                   type: integer
 *                   example: 1
 *                 totalResults:
 *                   type: integer
 *                   example: 1
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /coupons/{id}:
 *   get:
 *     summary: Get a coupon
 *     description: Fetch a specific coupon by ID.
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Coupon id
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Coupon'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update a coupon
 *     description: Only admins can update coupons.
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Coupon id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 20
 *               discount:
 *                 type: number
 *                 minimum: 0
 *               type:
 *                 type: string
 *                 enum: [percentage, fixed]
 *               couponFor:
 *                 type: string
 *                 enum: [product, minPurchase]
 *               products:
 *                 type: array
 *                 items:
 *                   type: string
 *               minPurchaseAmount:
 *                 type: number
 *                 minimum: 0
 *               isActive:
 *                 type: boolean
 *               maxUsage:
 *                 type: number
 *                 minimum: 1
 *             example:
 *               code: "SAVE25"
 *               discount: 25
 *               isActive: false
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Coupon'
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   delete:
 *     summary: Delete a coupon
 *     description: Only admins can delete coupons.
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Coupon id
 *     responses:
 *       "204":
 *         description: No content
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /coupons/apply:
 *   post:
 *     summary: Apply a coupon
 *     description: Apply a coupon to calculate discount for a cart.
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - cartTotal
 *               - productIds
 *             properties:
 *               code:
 *                 type: string
 *                 description: Coupon code
 *               cartTotal:
 *                 type: number
 *                 minimum: 0
 *                 description: Total cart amount
 *               productIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of product IDs in cart
 *             example:
 *               code: "SAVE20"
 *               cartTotal: 1000
 *               productIds: ["60f1a0b2c9e77c001f2e4a5b", "60f1a0b2c9e77c001f2e4a5c"]
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 couponCode:
 *                   type: string
 *                 discountType:
 *                   type: string
 *                 discountValue:
 *                   type: number
 *                 discountAmount:
 *                   type: number
 *                 originalAmount:
 *                   type: number
 *                 finalAmount:
 *                   type: number
 *                 savings:
 *                   type: number
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */
