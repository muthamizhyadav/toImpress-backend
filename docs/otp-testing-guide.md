# OTP Service with Fast2SMS - Testing Guide

This guide provides comprehensive curl commands and testing instructions for the Fast2SMS OTP service integration.

## Setup

### 1. Environment Configuration

Add these variables to your `.env` file:

```bash
# Fast2SMS Configuration
FAST2SMS_API_KEY=your_fast2sms_api_key_here
FAST2SMS_SENDER_ID=your_sender_id_here  # Optional
FAST2SMS_TEMPLATE_ID=your_template_id_here  # Optional

# Example:
# FAST2SMS_API_KEY=amb1luzp89BRLHfnMXvQF7Ihig4tP5YZNOsUTrE3V0WSACDeKqFvdw6huBbfkm4ecsC2NjxWlyrtaLIJ
# FAST2SMS_SENDER_ID=FTWSMS
# FAST2SMS_TEMPLATE_ID=your_approved_template_id
```

### 2. Fast2SMS Account Setup

1. Sign up at [Fast2SMS](https://www.fast2sms.com/)
2. Verify your account and mobile number
3. Navigate to Dev API section to get your API key
4. (Optional) Create an OTP template and get template ID
5. (Optional) Set up a sender ID if you have one

### 3. Development Mode

If Fast2SMS credentials are not configured, the service will run in development mode:
- OTP will be logged to console
- API will return success with the OTP in response (for testing only)
- No actual SMS will be sent

## API Endpoints

### Base URL
```
http://localhost:3000/api/v1
```

## CURL Commands for Testing

### 1. Request OTP

**Endpoint:** `POST /users/login/request-otp`

**Basic Request:**
```bash
curl -X POST http://localhost:3000/api/v1/users/login/request-otp \
  -H "Content-Type: application/json" \
  -d '{
    "mobile": "9876543210"
  }'
```

**Expected Response (Development Mode):**
```json
{
  "success": true,
  "message": "OTP sent successfully (development mode)",
  "otp": "123456",
  "development": true,
  "mobile": "9876543210"
}
```

**Expected Response (Production with Fast2SMS):**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "otp": "123456",
  "mobile": "9876543210",
  "fast2sms_response": {
    "return": true,
    "request_id": "fast2sms_request_id",
    "message": ["SMS sent successfully to 9876543210"]
  }
}
```

### 2. Verify OTP

**Endpoint:** `POST /users/login/verify-otp`

**Basic Request:**
```bash
curl -X POST http://localhost:3000/api/v1/users/login/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "mobile": "9876543210",
    "otp": "123456"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "user": {
    "_id": "user_id",
    "mobile": "9876543210",
    "name": null,
    "role": "user",
    "isEmailVerified": false,
    "createdAt": "2025-09-15T10:30:00.000Z",
    "updatedAt": "2025-09-15T10:30:00.000Z"
  },
  "tokens": {
    "access": {
      "token": "jwt_access_token",
      "expires": "2025-09-15T11:00:00.000Z"
    },
    "refresh": {
      "token": "jwt_refresh_token",
      "expires": "2025-10-15T10:30:00.000Z"
    }
  }
}
```

## Complete Testing Flow

### Step 1: Request OTP
```bash
# Store the response to extract OTP
curl -X POST http://localhost:3000/api/v1/users/login/request-otp \
  -H "Content-Type: application/json" \
  -d '{
    "mobile": "9876543210"
  }' \
  -w "\n" | tee otp_response.json
```

### Step 2: Extract OTP (in development mode)
```bash
# Extract OTP from response (for automation)
OTP=$(cat otp_response.json | grep -o '"otp":"[^"]*"' | cut -d'"' -f4)
echo "Extracted OTP: $OTP"
```

### Step 3: Verify OTP and Get Tokens
```bash
# Use extracted OTP to verify
curl -X POST http://localhost:3000/api/v1/users/login/verify-otp \
  -H "Content-Type: application/json" \
  -d "{
    \"mobile\": \"9876543210\",
    \"otp\": \"$OTP\"
  }" \
  -w "\n" | tee verify_response.json
```

### Step 4: Extract Access Token
```bash
# Extract access token for authenticated requests
ACCESS_TOKEN=$(cat verify_response.json | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Access Token: $ACCESS_TOKEN"
```

### Step 5: Test Authenticated Endpoint
```bash
# Test with the obtained token
curl -X GET http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

## Testing Different Mobile Numbers

```bash
# Test with different valid Indian mobile numbers
curl -X POST http://localhost:3000/api/v1/users/login/request-otp \
  -H "Content-Type: application/json" \
  -d '{"mobile": "9123456789"}'

curl -X POST http://localhost:3000/api/v1/users/login/request-otp \
  -H "Content-Type: application/json" \
  -d '{"mobile": "8987654321"}'

curl -X POST http://localhost:3000/api/v1/users/login/request-otp \
  -H "Content-Type: application/json" \
  -d '{"mobile": "7777777777"}'
```

## Error Testing

### Invalid Mobile Number Format
```bash
# Test with invalid mobile number
curl -X POST http://localhost:3000/api/v1/users/login/request-otp \
  -H "Content-Type: application/json" \
  -d '{"mobile": "12345"}' \
  -w "\n"
```

**Expected Error:**
```json
{
  "code": 400,
  "message": "Mobile number must be a valid 10-digit Indian mobile number"
}
```

### Missing Mobile Number
```bash
curl -X POST http://localhost:3000/api/v1/users/login/request-otp \
  -H "Content-Type: application/json" \
  -d '{}' \
  -w "\n"
```

### Invalid OTP
```bash
curl -X POST http://localhost:3000/api/v1/users/login/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "mobile": "9876543210",
    "otp": "000000"
  }' \
  -w "\n"
```

**Expected Error:**
```json
{
  "code": 401,
  "message": "Invalid or expired OTP"
}
```

### Expired OTP
```bash
# Wait 6 minutes after requesting OTP, then try to verify
curl -X POST http://localhost:3000/api/v1/users/login/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "mobile": "9876543210",
    "otp": "123456"
  }' \
  -w "\n"
```

## Advanced Testing Scenarios

### 1. Rapid OTP Requests
```bash
# Test multiple OTP requests for same number
for i in {1..3}; do
  echo "Request $i:"
  curl -X POST http://localhost:3000/api/v1/users/login/request-otp \
    -H "Content-Type: application/json" \
    -d '{"mobile": "9876543210"}' \
    -w "\n"
  sleep 2
done
```

### 2. Concurrent Requests
```bash
# Test concurrent OTP requests
curl -X POST http://localhost:3000/api/v1/users/login/request-otp \
  -H "Content-Type: application/json" \
  -d '{"mobile": "9111111111"}' &

curl -X POST http://localhost:3000/api/v1/users/login/request-otp \
  -H "Content-Type: application/json" \
  -d '{"mobile": "9222222222"}' &

wait
```

### 3. Load Testing with Different Numbers
```bash
# Generate and test multiple mobile numbers
for i in {1001..1010}; do
  mobile="91234${i}"
  echo "Testing mobile: $mobile"
  curl -X POST http://localhost:3000/api/v1/users/login/request-otp \
    -H "Content-Type: application/json" \
    -d "{\"mobile\": \"$mobile\"}" \
    -w "\n"
  sleep 1
done
```

## Production Testing

When Fast2SMS is properly configured:

### 1. Real SMS Test
```bash
# Replace with your actual mobile number
curl -X POST http://localhost:3000/api/v1/users/login/request-otp \
  -H "Content-Type: application/json" \
  -d '{
    "mobile": "YOUR_ACTUAL_MOBILE_NUMBER"
  }'
```

### 2. Monitor Logs
```bash
# In another terminal, monitor application logs
tail -f logs/app.log

# Or if using PM2
pm2 logs your-app-name
```

### 3. Check Fast2SMS Dashboard
- Login to your Fast2SMS account
- Check SMS delivery reports
- Monitor credit usage
- Review delivery status

## Automation Script

Create a simple test script:

```bash
#!/bin/bash
# otp_test.sh

BASE_URL="http://localhost:3000/api/v1"
MOBILE="9876543210"

echo "=== OTP Service Test ==="
echo "1. Requesting OTP for $MOBILE"

# Request OTP
OTP_RESPONSE=$(curl -s -X POST "$BASE_URL/users/login/request-otp" \
  -H "Content-Type: application/json" \
  -d "{\"mobile\": \"$MOBILE\"}")

echo "OTP Response: $OTP_RESPONSE"

# Extract OTP (development mode)
if echo "$OTP_RESPONSE" | grep -q '"development":true'; then
  OTP=$(echo "$OTP_RESPONSE" | grep -o '"otp":"[^"]*"' | cut -d'"' -f4)
  echo "Extracted OTP: $OTP"
  
  echo "2. Verifying OTP"
  VERIFY_RESPONSE=$(curl -s -X POST "$BASE_URL/users/login/verify-otp" \
    -H "Content-Type: application/json" \
    -d "{\"mobile\": \"$MOBILE\", \"otp\": \"$OTP\"}")
  
  echo "Verify Response: $VERIFY_RESPONSE"
  
  if echo "$VERIFY_RESPONSE" | grep -q '"success":true'; then
    echo "✅ OTP verification successful!"
  else
    echo "❌ OTP verification failed!"
  fi
else
  echo "Production mode - check your mobile for OTP"
fi
```

Make it executable and run:
```bash
chmod +x otp_test.sh
./otp_test.sh
```

## Troubleshooting

### Common Issues

1. **Invalid mobile number format**
   - Ensure mobile number is 10 digits starting with 6, 7, 8, or 9

2. **Fast2SMS API errors**
   - Check API key validity
   - Verify account balance
   - Ensure templates are approved (if using template ID)

3. **OTP not received**
   - Check mobile number is correct
   - Verify Fast2SMS account is active
   - Check spam/blocked messages

4. **Token validation errors**
   - Ensure proper JWT token format
   - Check token expiration
   - Verify bearer token prefix

### Debug Mode

Add debug logging:
```bash
DEBUG=* npm start
```

Or check application logs for detailed error messages.

## Environment Variables Summary

```env
# Required for production Fast2SMS
FAST2SMS_API_KEY=your_api_key

# Optional
FAST2SMS_SENDER_ID=your_sender_id
FAST2SMS_TEMPLATE_ID=your_template_id

# Other required variables
NODE_ENV=development
MONGODB_URL=mongodb://localhost:27017/toimpress
JWT_SECRET=your_jwt_secret
```

## Security Notes

1. **Never expose API keys** in client-side code
2. **Use HTTPS** in production
3. **Implement rate limiting** for OTP requests
4. **Monitor usage** to prevent abuse
5. **Validate mobile numbers** properly
6. **Set appropriate OTP expiry** (5 minutes recommended)

This completes the comprehensive testing guide for the Fast2SMS OTP service integration.
