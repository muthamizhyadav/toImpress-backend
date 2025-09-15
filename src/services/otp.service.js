const axios = require('axios');
const config = require('../config/config');

/**
 * Generate a random 6-digit OTP
 * @returns {string} OTP
 */
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP via Fast2SMS
 * @param {string} mobile - Mobile number (10 digits)
 * @param {string} otp - Optional OTP, if not provided will generate one
 * @returns {Promise<Object>} Response object
 */
async function sendOtp(mobile, otp = null) {
  try {
    // Generate OTP if not provided
    if (!otp) {
      otp = generateOtp();
    }

    // Validate mobile number format
    if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) {
      throw new Error('Invalid mobile number. Please provide a valid 10-digit Indian mobile number.');
    }

    const message = `Your To Impress login OTP is ${otp}. Do not share this OTP with anyone.`;
    
    // Try Fast2SMS first if API key is available
    if (config.fast2sms && config.fast2sms.apiKey) {
      try {
        console.log('Sending OTP via Fast2SMS...');
        
        // Fast2SMS API payload for simple text message
        const payload = {
          route: 'q',
          message: message,
          language: 'english',
          flash: 0,
          numbers: mobile
        };

        // If using OTP route (template-based)
        if (config.fast2sms.templateId) {
          payload.route = 'otp';
          payload.variables_values = otp;
          payload.template_id = config.fast2sms.templateId;
          delete payload.message; // Remove message when using template
        }

        // If sender ID is provided
        if (config.fast2sms.senderId) {
          payload.sender_id = config.fast2sms.senderId;
        }

        console.log('Fast2SMS Payload:', payload);
        
        const response = await axios.post(config.fast2sms.url, payload, {
          headers: {
            authorization: config.fast2sms.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 15000 // 15 seconds timeout
        });

        console.log('Fast2SMS Response:', response.data);
        
        // Check if the response indicates success
        if (response.data && response.data.return === true) {
          return {
            success: true,
            message: "OTP sent successfully via Fast2SMS",
            otp: config.env === 'development' ? otp : undefined, // Only return OTP in dev mode
            mobile: mobile,
            fast2sms_response: response.data,
            provider: 'fast2sms'
          };
        } else {
          console.error('Fast2SMS API returned error:', response.data);
          throw new Error(`Fast2SMS Error: ${response.data.message || 'SMS sending failed'}`);
        }
        
      } catch (apiError) {
        console.error('Fast2SMS API Error:', apiError.response?.data || apiError.message);
        
        // In production, throw error if SMS fails
        if (config.env === 'production') {
          throw new Error(`Failed to send OTP via SMS: ${apiError.response?.data?.message || apiError.message}`);
        }
        
        // In development, fall back to console logging
        console.log(`Fast2SMS failed, falling back to development mode`);
        console.log(`OTP for ${mobile}: ${otp} (Fast2SMS error: ${apiError.message})`);
        return {
          success: true,
          message: "OTP sent successfully (development fallback)",
          otp: otp,
          development: true,
          mobile: mobile,
          error: apiError.message,
          provider: 'development'
        };
      }
    }

    // Fallback for development mode when no Fast2SMS config
    console.log(`OTP for ${mobile}: ${otp} (Fast2SMS not configured - development mode)`);
    return {
      success: true,
      message: "OTP sent successfully (development mode)",
      otp: otp,
      development: true,
      mobile: mobile,
      provider: 'development'
    };
    
  } catch (err) {
    console.error('Global OTP Error:', err.message);
    
    // In development, return success with OTP for testing
    if (config.env === 'development') {
      console.log(`Development mode - OTP for ${mobile}: ${otp || generateOtp()}`);
      return {
        success: true,
        message: "OTP sent successfully (development mode)",
        otp: otp || generateOtp(),
        development: true,
        mobile: mobile,
        error: err.message,
        provider: 'development'
      };
    }
    
    throw new Error(`Failed to send OTP: ${err.message}`);
  }
}

/**
 * Verify OTP (placeholder for future implementation)
 * @param {string} mobile - Mobile number
 * @param {string} otp - OTP to verify
 * @param {string} storedOtp - Stored OTP for comparison
 * @returns {boolean} Verification result
 */
const verifyOtp = (mobile, otp, storedOtp) => {
  return otp === storedOtp;
};

module.exports = { 
  sendOtp, 
  generateOtp, 
  verifyOtp 
};
