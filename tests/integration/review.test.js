const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../src/app');
const { Review, Product, User } = require('../../src/models');
const { userOne, userTwo, admin, insertUsers } = require('../fixtures/user.fixture');
const { userOneAccessToken, adminAccessToken } = require('../fixtures/token.fixture');

describe('Review routes', () => {
  let product;

  beforeEach(async () => {
    await insertUsers([userOne, admin]);
    
    // Create a test product
    product = await Product.create({
      productTitle: 'Test Product for Review',
      productDescription: 'A test product for reviewing',
      price: 100,
      salePrice: 80,
      stockQuantity: 10,
      category: 'test',
      stockStatus: 'in_stock',
    });
  });

  describe('POST /v1/reviews/product/:productId', () => {
    test('should return 201 and successfully create a review if data is ok', async () => {
      const reviewData = {
        rating: 5,
        title: 'Excellent product!',
        comment: 'I love this product. Great quality and fast shipping.',
        images: ['https://example.com/review-image1.jpg'],
      };

      const res = await request(app)
        .post(`/v1/reviews/product/${product._id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send(reviewData)
        .expect(httpStatus.CREATED);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.rating).toBe(5);
      expect(res.body.data.title).toBe('Excellent product!');
      expect(res.body.data.status).toBe('approved');
    });

    test('should return 400 error if user tries to review the same product twice', async () => {
      const reviewData = {
        rating: 5,
        title: 'First review',
        comment: 'This is my first review',
      };

      // Create first review
      await request(app)
        .post(`/v1/reviews/product/${product._id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send(reviewData)
        .expect(httpStatus.CREATED);

      // Try to create second review for same product
      await request(app)
        .post(`/v1/reviews/product/${product._id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send({
          rating: 4,
          title: 'Second review',
          comment: 'Trying to review again',
        })
        .expect(httpStatus.BAD_REQUEST);
    });

    test('should return 401 error if access token is missing', async () => {
      await request(app)
        .post(`/v1/reviews/product/${product._id}`)
        .send({
          rating: 5,
          title: 'Test',
          comment: 'Test comment',
        })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /v1/reviews/product/:productId', () => {
    test('should return 200 and product reviews', async () => {
      // Create a review first
      await Review.create({
        user: userOne._id,
        product: product._id,
        rating: 5,
        title: 'Great product',
        comment: 'Really love it!',
        status: 'approved',
      });

      const res = await request(app)
        .get(`/v1/reviews/product/${product._id}`)
        .expect(httpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.statistics).toBeDefined();
      expect(res.body.statistics.averageRating).toBe(5);
      expect(res.body.statistics.totalReviews).toBe(1);
    });

    test('should return filtered reviews by rating', async () => {
      // Create reviews with different ratings
      await Review.create({
        user: userOne._id,
        product: product._id,
        rating: 5,
        title: 'Excellent',
        comment: 'Love it!',
        status: 'approved',
      });

      await Review.create({
        user: admin._id,
        product: product._id,
        rating: 3,
        title: 'Average',
        comment: 'It is okay',
        status: 'approved',
      });

      const res = await request(app)
        .get(`/v1/reviews/product/${product._id}?rating=5`)
        .expect(httpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].rating).toBe(5);
    });
  });

  describe('GET /v1/reviews/my-reviews', () => {
    test('should return 200 and user reviews', async () => {
      await Review.create({
        user: userOne._id,
        product: product._id,
        rating: 4,
        title: 'Good product',
        comment: 'Pretty good!',
        status: 'approved',
      });

      const res = await request(app)
        .get('/v1/reviews/my-reviews')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].user).toBe(userOne._id);
    });
  });

  describe('GET /v1/reviews', () => {
    test('should return 200 and all reviews for admin', async () => {
      await Review.create({
        user: userOne._id,
        product: product._id,
        rating: 4,
        title: 'Good product',
        comment: 'Pretty good!',
        status: 'approved',
      });

      const res = await request(app)
        .get('/v1/reviews')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    test('should return 403 error if user tries to access all reviews', async () => {
      await request(app)
        .get('/v1/reviews')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .expect(httpStatus.FORBIDDEN);
    });
  });

  describe('PATCH /v1/reviews/:reviewId', () => {
    test('should return 200 and update review if user owns it', async () => {
      const review = await Review.create({
        user: userOne._id,
        product: product._id,
        rating: 4,
        title: 'Good product',
        comment: 'Pretty good!',
        status: 'approved',
      });

      const updateData = {
        rating: 5,
        title: 'Updated: Excellent product',
        comment: 'Changed my mind, it is excellent!',
      };

      const res = await request(app)
        .patch(`/v1/reviews/${review._id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send(updateData)
        .expect(httpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data.rating).toBe(5);
      expect(res.body.data.title).toBe('Updated: Excellent product');
    });

    test('should return 403 error if user tries to update someone else\'s review', async () => {
      const review = await Review.create({
        user: admin._id,
        product: product._id,
        rating: 4,
        title: 'Admin review',
        comment: 'Admin comment',
        status: 'approved',
      });

      await request(app)
        .patch(`/v1/reviews/${review._id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send({ rating: 5 })
        .expect(httpStatus.FORBIDDEN);
    });
  });

  describe('POST /v1/reviews/:reviewId/helpful', () => {
    test('should return 200 and mark review as helpful', async () => {
      const review = await Review.create({
        user: admin._id,
        product: product._id,
        rating: 5,
        title: 'Great product',
        comment: 'Really helpful review',
        status: 'approved',
      });

      const res = await request(app)
        .post(`/v1/reviews/${review._id}/helpful`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data.helpfulCount).toBe(1);
    });

    test('should return 400 error if user tries to vote helpful twice', async () => {
      const review = await Review.create({
        user: admin._id,
        product: product._id,
        rating: 5,
        title: 'Great product',
        comment: 'Really helpful review',
        status: 'approved',
        helpfulVotes: [{ user: userOne._id }],
      });

      await request(app)
        .post(`/v1/reviews/${review._id}/helpful`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('POST /v1/reviews/:reviewId/report', () => {
    test('should return 200 and report review', async () => {
      const review = await Review.create({
        user: admin._id,
        product: product._id,
        rating: 1,
        title: 'Bad review',
        comment: 'This might be spam',
        status: 'approved',
      });

      const reportData = {
        reason: 'spam',
        description: 'This review appears to be spam',
      };

      const res = await request(app)
        .post(`/v1/reviews/${review._id}/report`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send(reportData)
        .expect(httpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Review reported successfully');
    });
  });

  describe('GET /v1/reviews/stats', () => {
    test('should return 200 and review statistics for admin', async () => {
      await Review.create({
        user: userOne._id,
        product: product._id,
        rating: 5,
        title: 'Great',
        comment: 'Good product',
        status: 'approved',
      });

      const res = await request(app)
        .get('/v1/reviews/stats')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.byStatus).toBeDefined();
      expect(res.body.data.overall).toBeDefined();
    });

    test('should return 403 error if user tries to access review statistics', async () => {
      await request(app)
        .get('/v1/reviews/stats')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .expect(httpStatus.FORBIDDEN);
    });
  });
});
