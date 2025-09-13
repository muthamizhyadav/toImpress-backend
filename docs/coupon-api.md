# Coupon API Documentation

This document provides comprehensive information about the Coupon API endpoints for managing discount coupons in the e-commerce application.

## Overview

The Coupon API allows you to:
- Create and manage discount coupons
- Apply percentage or fixed amount discounts
- Set minimum purchase requirements
- Link coupons to specific products
- Track usage and set usage limits
- Validate and apply coupons during checkout

## Coupon Schema

```javascript
{
  code: String,              // Unique coupon code (3-20 chars, uppercase)
  discount: Number,          // Discount amount (min: 0)
  type: String,             // 'percentage' or 'fixed'
  couponFor: String,        // 'product' or 'minPurchase'
  products: [ObjectId],     // Array of product IDs (for product coupons)
  minPurchaseAmount: Number, // Required for minPurchase coupons
  isActive: Boolean,        // Whether coupon is active (default: true)
  usageCount: Number,       // Current usage count (default: 0)
  maxUsage: Number,         // Maximum usage limit (null = unlimited)
  createdAt: Date,          // Creation timestamp
  updatedAt: Date           // Last update timestamp
}
```

## API Endpoints

### 1. Create Coupon
- **POST** `/api/v1/coupons`
- **Authentication**: Required (Admin)
- **Permission**: `manageCoupons`

#### Request Body Examples:

**Percentage Discount with Minimum Purchase:**
```json
{
  "code": "SAVE20",
  "discount": 20,
  "type": "percentage",
  "couponFor": "minPurchase",
  "minPurchaseAmount": 500,
  "isActive": true,
  "maxUsage": 100
}
```

**Fixed Discount for Specific Products:**
```json
{
  "code": "PRODUCT10",
  "discount": 100,
  "type": "fixed",
  "couponFor": "product",
  "products": ["60f1a0b2c9e77c001f2e4a5b", "60f1a0b2c9e77c001f2e4a5c"],
  "isActive": true,
  "maxUsage": 50
}
```

### 2. Get All Coupons
- **GET** `/api/v1/coupons`
- **Authentication**: Required
- **Permission**: `getCoupons`

#### Query Parameters:
- `page` (number): Page number for pagination
- `limit` (number): Number of results per page
- `code` (string): Filter by coupon code
- `type` (string): Filter by type ('percentage' or 'fixed')
- `couponFor` (string): Filter by coupon application ('product' or 'minPurchase')
- `isActive` (boolean): Filter by active status
- `sortBy` (string): Sort field and direction (e.g., 'createdAt:desc')

#### Example:
```
GET /api/v1/coupons?page=1&limit=10&isActive=true&type=percentage
```

### 3. Get Coupon by ID
- **GET** `/api/v1/coupons/:couponId`
- **Authentication**: Required
- **Permission**: `getCoupons`

### 4. Get Coupon by Code
- **GET** `/api/v1/coupons/code/:code`
- **Authentication**: Required
- **Permission**: `getCoupons`

#### Example:
```
GET /api/v1/coupons/code/SAVE20
```

### 5. Update Coupon
- **PATCH** `/api/v1/coupons/:couponId`
- **Authentication**: Required (Admin)
- **Permission**: `manageCoupons`

#### Request Body Example:
```json
{
  "discount": 25,
  "maxUsage": 150,
  "isActive": false
}
```

### 6. Delete Coupon
- **DELETE** `/api/v1/coupons/:couponId`
- **Authentication**: Required (Admin)
- **Permission**: `manageCoupons`

### 7. Validate Coupon
- **POST** `/api/v1/coupons/validate`
- **Authentication**: Required
- **Permission**: `getCoupons`

#### Request Body:
```json
{
  "code": "SAVE20",
  "cartTotal": 1000,
  "productIds": ["60f1a0b2c9e77c001f2e4a5b", "60f1a0b2c9e77c001f2e4a5c"]
}
```

#### Response:
```json
{
  "valid": true,
  "coupon": { /* coupon object */ },
  "message": "Coupon is valid"
}
```

### 8. Apply Coupon
- **POST** `/api/v1/coupons/apply`
- **Authentication**: Required
- **Permission**: `getCoupons`

#### Request Body:
```json
{
  "code": "SAVE20",
  "cartTotal": 1000,
  "productIds": ["60f1a0b2c9e77c001f2e4a5b"]
}
```

#### Response:
```json
{
  "couponCode": "SAVE20",
  "discountType": "percentage",
  "discountValue": 20,
  "discountAmount": 200,
  "originalAmount": 1000,
  "finalAmount": 800,
  "savings": 200
}
```

### 9. Get Active Coupons for Product
- **GET** `/api/v1/coupons/product/:productId`
- **Authentication**: Required
- **Permission**: `getCoupons`

Returns all active coupons that can be applied to a specific product.

### 10. Increment Usage Count
- **POST** `/api/v1/coupons/increment-usage`
- **Authentication**: Required (Admin)
- **Permission**: `manageCoupons`

#### Request Body:
```json
{
  "code": "SAVE20"
}
```

## Coupon Types

### 1. Percentage Discount
- `type: "percentage"`
- `discount`: Value between 0-100 representing percentage
- Example: 20% off

### 2. Fixed Amount Discount
- `type: "fixed"`
- `discount`: Fixed amount to subtract from total
- Example: ₹100 off

## Coupon Application Types

### 1. Product Coupons (`couponFor: "product"`)
- Applied to specific products
- `products` array can contain specific product IDs
- Empty `products` array = applies to all products (global product coupon)

### 2. Minimum Purchase Coupons (`couponFor: "minPurchase"`)
- Applied when cart total meets minimum purchase amount
- Requires `minPurchaseAmount` field
- Applies to entire cart

## Validation Rules

### Coupon Code
- Must be unique
- 3-20 characters long
- Automatically converted to uppercase
- Alphanumeric characters recommended

### Percentage Discounts
- Cannot exceed 100%
- Calculated as: `(cartTotal × discount) / 100`

### Fixed Discounts
- Cannot exceed cart total
- Applied as-is up to cart total amount

### Usage Limits
- `maxUsage: null` = unlimited usage
- `usageCount` tracks current usage
- Coupon becomes invalid when `usageCount >= maxUsage`

### Product Eligibility
- For product coupons: at least one cart item must match coupon's product list
- Empty product list = applies to all products

### Minimum Purchase
- For minPurchase coupons: cart total must meet or exceed `minPurchaseAmount`

## Error Handling

Common error responses:

### 400 Bad Request
```json
{
  "code": 400,
  "message": "Coupon code already taken"
}
```

### 404 Not Found
```json
{
  "code": 404,
  "message": "Coupon not found"
}
```

### 400 Bad Request (Validation Errors)
```json
{
  "code": 400,
  "message": "Minimum purchase amount of ₹500 required"
}
```

```json
{
  "code": 400,
  "message": "No eligible products in cart for this coupon"
}
```

```json
{
  "code": 400,
  "message": "Coupon usage limit exceeded"
}
```

## Usage Examples

### Creating Different Types of Coupons

1. **20% off on orders above ₹500:**
```json
{
  "code": "WELCOME20",
  "discount": 20,
  "type": "percentage",
  "couponFor": "minPurchase",
  "minPurchaseAmount": 500
}
```

2. **₹100 flat discount on specific products:**
```json
{
  "code": "FLAT100",
  "discount": 100,
  "type": "fixed",
  "couponFor": "product",
  "products": ["product1_id", "product2_id"]
}
```

3. **15% off on all products (limited usage):**
```json
{
  "code": "LIMITED15",
  "discount": 15,
  "type": "percentage",
  "couponFor": "product",
  "products": [],
  "maxUsage": 100
}
```

### Integration with Order Process

1. **During Cart Review:**
   - Use `GET /coupons/product/:productId` to show available coupons
   - Use `POST /coupons/validate` to check coupon validity

2. **During Checkout:**
   - Use `POST /coupons/apply` to calculate final amount
   - Store coupon details in order

3. **After Order Completion:**
   - Use `POST /coupons/increment-usage` to update usage count

## Testing with Postman

A Postman collection is available at `postman-collection/Coupon_API.postman_collection.json` with pre-configured requests for all endpoints.

### Environment Variables Required:
- `base_url`: Your API base URL (e.g., http://localhost:3000)
- `access_token`: JWT token for authentication
- `coupon_id`: Coupon ID for update/delete operations
- `product_id`: Product ID for testing

## Security Considerations

1. **Authentication**: All endpoints require valid JWT token
2. **Authorization**: Admin permissions required for create/update/delete operations
3. **Code Uniqueness**: Coupon codes are automatically validated for uniqueness
4. **Usage Tracking**: System prevents exceeding usage limits
5. **Input Validation**: All inputs are validated using Joi schemas

## Performance Optimizations

1. **Database Indexes**: 
   - Index on `code` for fast lookups
   - Index on `isActive` for filtering
   - Index on `couponFor` for categorization

2. **Caching**: Consider implementing Redis caching for frequently accessed coupons

3. **Pagination**: All list endpoints support pagination to handle large datasets

## Monitoring and Analytics

Track these metrics for coupon performance:
- Usage count per coupon
- Conversion rates
- Revenue impact
- Popular coupon types
- Expiry and deactivation patterns

## Future Enhancements

Potential features to consider:
- Expiry dates for coupons
- User-specific coupons
- Category-based coupons
- Stackable coupons
- Referral coupons
- Auto-generated coupon codes
