const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const cartValidation = require('../../validations/cart.validation');
const cartController = require('../../controllers/cart.controller');

const router = express.Router();

router
  .route('/')
  .get(auth(), cartController.getCart)
  .post(auth(), cartController.addToCart)
  .patch(auth(), validate(cartValidation.updateCartItem), cartController.updateCart)
  .delete(auth(), cartController.clearCart);

router
  .route('/item')
  .delete(auth(), validate(cartValidation.removeFromCart), cartController.removeFromCart);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Cart management
 */

/**
 * @swagger
 * /cart:
 *   get:
 *     summary: Get user's cart
 *     description: Retrieve the current user's shopping cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Cart'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 *   post:
 *     summary: Add or update item in cart
 *     description: Add a new item to cart or update existing item quantity. Set quantity to 0 to remove item from cart.
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *             properties:
 *               productId:
 *                 type: string
 *                 description: Product ID to add/update in cart
 *               quantity:
 *                 type: integer
 *                 minimum: 0
 *                 default: 1
 *                 description: Quantity of the product (set to 0 to remove item)
 *               selectedColor:
 *                 type: string
 *                 description: Selected color variant
 *               selectedSize:
 *                 type: string
 *                 description: Selected size variant
 *             example:
 *               productId: "60d5ecb74b24c72b8c8b4567"
 *               quantity: 2
 *               selectedColor: "Red"
 *               selectedSize: "M"
 *     responses:
 *       200:
 *         description: Item added, updated, or removed from cart successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Cart'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Product not found
 *
 *   delete:
 *     summary: Clear cart
 *     description: Remove all items from the user's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Cart'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Cart not found
 */

/**
 * @swagger
 * /cart/{itemId}:
 *   patch:
 *     summary: Update cart item
 *     description: Update quantity or variants of a cart item. Set quantity to 0 to remove the item from cart.
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Cart item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 0
 *                 description: New quantity for the item (set to 0 to remove item)
 *               selectedColor:
 *                 type: string
 *                 description: Updated color variant
 *               selectedSize:
 *                 type: string
 *                 description: Updated size variant
 *             example:
 *               quantity: 3
 *               selectedColor: "Blue"
 *               selectedSize: "L"
 *     responses:
 *       200:
 *         description: Cart item updated or removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Cart'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Cart item not found
 *
 *   delete:
 *     summary: Remove item from cart
 *     description: Remove a specific item from the user's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Cart item ID
 *     responses:
 *       200:
 *         description: Item removed from cart successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Cart'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Cart item not found
 */