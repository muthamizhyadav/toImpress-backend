# Orders API Documentation

## Overview
The Orders API allows you to manage orders in the toImpress-backend application. It provides endpoints for creating, reading, updating, and deleting orders.

## Base URL
```
http://localhost:3001/v1/orders
```

## Authentication
All endpoints require authentication using a Bearer token in the Authorization header:
```
Authorization: Bearer <your-access-token>
```

## Permissions
- **Users**: Can create orders and view their own orders
- **Admins**: Can view all orders, update order status, and access order statistics

## Endpoints

### 1. Create Order
Create a new order for the authenticated user.

**POST** `/v1/orders`

**Request Body:**
```json
{
  "items": [
    {
      "product": "product-id",
      "quantity": 2,
      "selectedColor": "red",
      "selectedSize": "M"
    }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "billingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "paymentMethod": "credit_card",
  "notes": "Please deliver to front door",
  "shippingCost": 10,
  "tax": 8.5,
  "discount": 0
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "_id": "order-id",
    "orderNumber": "ORD-000001",
    "user": {...},
    "items": [...],
    "totalAmount": 108.5,
    "status": "pending",
    "paymentStatus": "pending",
    "createdAt": "2025-08-19T...",
    ...
  }
}
```

### 2. Get User Orders
Get all orders for the authenticated user.

**GET** `/v1/orders/my-orders`

**Query Parameters:**
- `status`: Filter by order status (pending, confirmed, processing, shipped, delivered, cancelled)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 5,
    "totalPages": 1,
    "currentPage": 1,
    "itemsPerPage": 10,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

### 3. Get All Orders (Admin Only)
Get all orders in the system.

**GET** `/v1/orders`

**Query Parameters:**
- `status`: Filter by order status
- `paymentStatus`: Filter by payment status
- `userId`: Filter by user ID
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `sortBy`: Sort field and direction (e.g., "createdAt:desc")

### 4. Get Order by ID
Get a specific order by its ID.

**GET** `/v1/orders/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "order-id",
    "orderNumber": "ORD-000001",
    "user": {...},
    "items": [...],
    "status": "pending",
    ...
  }
}
```

### 5. Update Order (Admin Only)
Update an order's status or other details.

**PATCH** `/v1/orders/:id`

**Request Body:**
```json
{
  "status": "shipped",
  "trackingNumber": "1234567890",
  "estimatedDelivery": "2025-08-25",
  "notes": "Package shipped via FedEx"
}
```

### 6. Delete Order (Admin Only)
Delete an order. Only pending or cancelled orders can be deleted.

**DELETE** `/v1/orders/:id`

### 7. Get Order Statistics (Admin Only)
Get order statistics including total orders, revenue, and status distribution.

**GET** `/v1/orders/stats`

**Response:**
```json
{
  "success": true,
  "data": {
    "overall": {
      "totalOrders": 150,
      "totalRevenue": 15000,
      "averageOrderValue": 100
    },
    "byStatus": {
      "pending": 10,
      "confirmed": 20,
      "processing": 15,
      "shipped": 25,
      "delivered": 75,
      "cancelled": 5
    }
  }
}
```

## Order Status Flow

1. **pending** → **confirmed** (Admin confirms the order)
2. **confirmed** → **processing** (Order is being processed)
3. **processing** → **shipped** (Order is shipped)
4. **shipped** → **delivered** (Order is delivered)

Orders can be **cancelled** from any status except **delivered**.

## Error Responses

All error responses follow this format:
```json
{
  "code": 400,
  "message": "Error message describing what went wrong"
}
```

Common HTTP status codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (order doesn't exist)
- `500` - Internal Server Error

## Example Usage

### Creating an Order (cURL)
```bash
curl -X POST http://localhost:3001/v1/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{
      "product": "product-id",
      "quantity": 1
    }],
    "shippingAddress": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA"
    },
    "paymentMethod": "credit_card"
  }'
```

### Getting User Orders (cURL)
```bash
curl -X GET "http://localhost:3001/v1/orders/my-orders?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Notes

- Order numbers are automatically generated in the format `ORD-XXXXXX`
- Product stock quantities are automatically updated when orders are created
- Total amounts are calculated automatically based on items, shipping, tax, and discounts
- Orders include both shipping and billing addresses
- The system maintains order history and tracks status changes
