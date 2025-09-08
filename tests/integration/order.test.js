const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../src/app');
const { Order, Product, User } = require('../../src/models');
const { userOne, userTwo, admin, insertUsers } = require('../fixtures/user.fixture');
const { userOneAccessToken, adminAccessToken } = require('../fixtures/token.fixture');

describe('Order routes', () => {
  beforeEach(async () => {
    await insertUsers([userOne, admin]);
    
    // Create a test product
    await Product.create({
      productTitle: 'Test Product',
      productDescription: 'A test product',
      price: 100,
      salePrice: 80,
      stockQuantity: 10,
      category: 'test',
      stockStatus: 'in_stock',
    });
  });

  describe('POST /v1/orders', () => {
    test('should return 201 and successfully create an order if data is ok', async () => {
      const product = await Product.findOne({ productTitle: 'Test Product' });
      const orderData = {
        items: [
          {
            product: product._id,
            quantity: 2,
            selectedColor: 'red',
            selectedSize: 'M',
          },
        ],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
        },
        paymentMethod: 'credit_card',
        notes: 'Test order',
        shippingCost: 10,
        tax: 5,
        discount: 0,
      };

      const res = await request(app)
        .post('/v1/orders')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send(orderData)
        .expect(httpStatus.CREATED);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.status).toBe('pending');
      expect(res.body.data.paymentStatus).toBe('pending');
    });

    test('should return 401 error if access token is missing', async () => {
      await request(app)
        .post('/v1/orders')
        .send({})
        .expect(httpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /v1/orders/my-orders', () => {
    test('should return 200 and user orders', async () => {
      const product = await Product.findOne({ productTitle: 'Test Product' });
      await Order.create({
        user: userOne._id,
        items: [
          {
            product: product._id,
            productTitle: product.productTitle,
            price: product.salePrice,
            quantity: 1,
            subtotal: product.salePrice * 1,
          },
        ],
        totalAmount: 90,
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
        },
        paymentMethod: 'credit_card',
      });

      const res = await request(app)
        .get('/v1/orders/my-orders')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('GET /v1/orders', () => {
    test('should return 200 and all orders for admin', async () => {
      const product = await Product.findOne({ productTitle: 'Test Product' });
      await Order.create({
        user: userOne._id,
        items: [
          {
            product: product._id,
            productTitle: product.productTitle,
            price: product.salePrice,
            quantity: 1,
            subtotal: product.salePrice * 1,
          },
        ],
        totalAmount: 90,
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
        },
        paymentMethod: 'credit_card',
      });

      const res = await request(app)
        .get('/v1/orders')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    test('should return 403 error if user tries to access all orders', async () => {
      await request(app)
        .get('/v1/orders')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .expect(httpStatus.FORBIDDEN);
    });
  });

  describe('GET /v1/orders/stats', () => {
    test('should return 200 and order statistics for admin', async () => {
      const res = await request(app)
        .get('/v1/orders/stats')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.overall).toBeDefined();
      expect(res.body.data.byStatus).toBeDefined();
    });

    test('should return 403 error if user tries to access order statistics', async () => {
      await request(app)
        .get('/v1/orders/stats')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .expect(httpStatus.FORBIDDEN);
    });
  });
});
