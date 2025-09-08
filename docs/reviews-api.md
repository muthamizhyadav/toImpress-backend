# Review API - cURL Commands

All endpoints assume your server is running on `http://localhost:3000`

## 1. Create Review for a Product (POST)
```bash
curl -X POST http://localhost:3000/v1/reviews/product/PRODUCT_ID_HERE \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "title": "Excellent product!",
    "comment": "I love this product. Great quality and fast shipping. Highly recommend to everyone!",
    "images": [
      "https://example.com/review-image1.jpg",
      "https://example.com/review-image2.jpg"
    ]
  }'
```

## 2. Get All Reviews for a Product (GET)
```bash
curl -X GET "http://localhost:3000/v1/reviews/product/PRODUCT_ID_HERE?page=1&limit=10"
```

## 3. Get Product Reviews with Filters (GET)
```bash
curl -X GET "http://localhost:3000/v1/reviews/product/PRODUCT_ID_HERE?rating=5&verified=true&sortBy=createdAt:desc&page=1&limit=10"
```

## 4. Get User's Own Reviews (GET)
```bash
curl -X GET "http://localhost:3000/v1/reviews/my-reviews?page=1&limit=10" \
  -H "Authorization: Bearer USER_TOKEN"
```

## 5. Get User's Reviews with Filters (GET)
```bash
curl -X GET "http://localhost:3000/v1/reviews/my-reviews?status=approved&rating=4&page=1&limit=5" \
  -H "Authorization: Bearer USER_TOKEN"
```

## 6. Get All Reviews - Admin Only (GET)
```bash
curl -X GET "http://localhost:3000/v1/reviews?page=1&limit=10" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

## 7. Get All Reviews with Filters - Admin Only (GET)
```bash
curl -X GET "http://localhost:3000/v1/reviews?status=pending&rating=1&productId=PRODUCT_ID&userId=USER_ID&sortBy=createdAt:desc" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

## 8. Get Review by ID (GET)
```bash
curl -X GET http://localhost:3000/v1/reviews/REVIEW_ID_HERE \
  -H "Authorization: Bearer USER_TOKEN"
```

## 9. Update Own Review (PATCH)
```bash
curl -X PATCH http://localhost:3000/v1/reviews/REVIEW_ID_HERE \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 4,
    "title": "Updated: Good product",
    "comment": "Updated my review after using it for a month. Still good but found some minor issues.",
    "images": ["https://example.com/updated-image.jpg"]
  }'
```

## 10. Update Review Status - Admin Only (PATCH)
```bash
curl -X PATCH http://localhost:3000/v1/reviews/REVIEW_ID_HERE \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "adminNotes": "Review approved after verification"
  }'
```

## 11. Reject Review - Admin Only (PATCH)
```bash
curl -X PATCH http://localhost:3000/v1/reviews/REVIEW_ID_HERE \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "rejected",
    "adminNotes": "Review rejected due to inappropriate content"
  }'
```

## 12. Delete Review (DELETE)
```bash
curl -X DELETE http://localhost:3000/v1/reviews/REVIEW_ID_HERE \
  -H "Authorization: Bearer USER_OR_ADMIN_TOKEN"
```

## 13. Mark Review as Helpful (POST)
```bash
curl -X POST http://localhost:3000/v1/reviews/REVIEW_ID_HERE/helpful \
  -H "Authorization: Bearer USER_TOKEN"
```

## 14. Remove Helpful Vote (DELETE)
```bash
curl -X DELETE http://localhost:3000/v1/reviews/REVIEW_ID_HERE/helpful \
  -H "Authorization: Bearer USER_TOKEN"
```

## 15. Report Review (POST)
```bash
curl -X POST http://localhost:3000/v1/reviews/REVIEW_ID_HERE/report \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "spam",
    "description": "This review appears to be spam with fake information"
  }'
```

## 16. Report Review - Other Reasons (POST)
```bash
curl -X POST http://localhost:3000/v1/reviews/REVIEW_ID_HERE/report \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "inappropriate",
    "description": "Contains inappropriate language"
  }'
```

## 17. Upload Review Images (POST)
```bash
curl -X POST http://localhost:3000/v1/reviews/upload/images \
  -H "Authorization: Bearer USER_TOKEN" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg"
```

## 18. Get Review Statistics - Admin Only (GET)
```bash
curl -X GET http://localhost:3000/v1/reviews/stats \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

## 19. Test Unauthorized Access (GET)
```bash
curl -X GET http://localhost:3000/v1/reviews/stats
```

## Available Report Reasons:
- `spam` - Spam content
- `inappropriate` - Inappropriate content
- `fake` - Fake review
- `offensive` - Offensive language
- `other` - Other reasons

## Available Review Statuses:
- `pending` - Under review
- `approved` - Approved and visible
- `rejected` - Rejected and hidden

## Available Sort Options:
- `createdAt:desc` - Newest first (default)
- `createdAt:asc` - Oldest first
- `rating:desc` - Highest rating first
- `rating:asc` - Lowest rating first
- `helpfulCount:desc` - Most helpful first

## Example Response for Product Reviews:
```json
{
  "success": true,
  "data": [
    {
      "_id": "review-id",
      "user": {
        "_id": "user-id",
        "name": "John Doe"
      },
      "product": {
        "_id": "product-id",
        "productTitle": "Amazing Product",
        "images": [...]
      },
      "rating": 5,
      "title": "Excellent product!",
      "comment": "I love this product...",
      "images": [...],
      "isVerifiedPurchase": true,
      "helpfulCount": 15,
      "status": "approved",
      "createdAt": "2025-08-19T...",
      "updatedAt": "2025-08-19T..."
    }
  ],
  "statistics": {
    "averageRating": 4.5,
    "totalReviews": 150,
    "ratingBreakdown": {
      "1": 5,
      "2": 10,
      "3": 20,
      "4": 45,
      "5": 70
    }
  },
  "pagination": {
    "total": 150,
    "totalPages": 15,
    "currentPage": 1,
    "itemsPerPage": 10,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```
