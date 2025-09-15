#!/bin/bash

# OTP Verification Test Script
BASE_URL="http://localhost:3000/api/v1"
MOBILE="9876543210"

echo "🚀 Starting OTP Verification Test"
echo "================================"

# Step 1: Request OTP
echo "📱 Step 1: Requesting OTP for mobile: $MOBILE"
OTP_RESPONSE=$(curl -s -X POST "$BASE_URL/users/login/request-otp" \
  -H "Content-Type: application/json" \
  -d "{\"mobile\": \"$MOBILE\"}")

echo "📨 OTP Request Response:"
echo "$OTP_RESPONSE" | jq '.' 2>/dev/null || echo "$OTP_RESPONSE"
echo ""

# Extract OTP from response
OTP=""
if echo "$OTP_RESPONSE" | grep -q '"otp"'; then
  OTP=$(echo "$OTP_RESPONSE" | grep -o '"otp":"[^"]*"' | cut -d'"' -f4)
  echo "✅ Extracted OTP: $OTP"
elif echo "$OTP_RESPONSE" | grep -q '"success":true'; then
  echo "📲 SMS sent successfully! Check your mobile for OTP."
  echo "🔑 Please enter the OTP you received:"
  read -p "OTP: " OTP
else
  echo "❌ Failed to request OTP"
  echo "Response: $OTP_RESPONSE"
  exit 1
fi

if [ -z "$OTP" ]; then
  echo "❌ No OTP available for verification"
  exit 1
fi

echo ""
echo "🔐 Step 2: Verifying OTP: $OTP"

# Step 2: Verify OTP
VERIFY_RESPONSE=$(curl -s -X POST "$BASE_URL/users/login/verify-otp" \
  -H "Content-Type: application/json" \
  -d "{\"mobile\": \"$MOBILE\", \"otp\": \"$OTP\"}")

echo "🔍 OTP Verification Response:"
echo "$VERIFY_RESPONSE" | jq '.' 2>/dev/null || echo "$VERIFY_RESPONSE"
echo ""

# Check verification result
if echo "$VERIFY_RESPONSE" | grep -q '"success":true'; then
  echo "✅ OTP Verification Successful!"
  
  # Extract access token
  ACCESS_TOKEN=$(echo "$VERIFY_RESPONSE" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ ! -z "$ACCESS_TOKEN" ]; then
    echo "🎫 Access Token: ${ACCESS_TOKEN:0:20}..."
    
    # Test authenticated request
    echo ""
    echo "🧪 Step 3: Testing authenticated request"
    USER_RESPONSE=$(curl -s -X GET "$BASE_URL/users" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "Content-Type: application/json")
    
    if echo "$USER_RESPONSE" | grep -q '"results"'; then
      echo "✅ Authenticated request successful!"
    else
      echo "❌ Authenticated request failed"
      echo "$USER_RESPONSE"
    fi
  fi
else
  echo "❌ OTP Verification Failed!"
  if echo "$VERIFY_RESPONSE" | grep -q "Invalid or expired OTP"; then
    echo "💡 The OTP might be expired (5 minutes) or incorrect"
  fi
fi

echo ""
echo "🏁 Test Complete!"
