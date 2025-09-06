const axios = require('axios');

const FAST2SMS_API_KEY = 'amb1luzp89BRLHfnMXvQF7Ihig4tP5YZNOsUTrE3V0WSACDeKqFvdw6huBbfkm4ecsC2NjxWlyrtaLIJ';
const FAST2SMS_URL = 'https://www.fast2sms.com/dev/bulkV2';

async function sendOtp(mobile, otp) {
  const message = `Your To Impress login OTP is ${otp}. Do not share this OTP with anyone.`;
  const payload = {
    variables_values: otp,
    route: 'otp',
    numbers: mobile,
  };
  console.log(payload,"PAYLOAD");
  
  // Skip Fast2SMS for now, just return success with auto-generated OTP
  console.log(`OTP for ${mobile}: ${otp} (Fast2SMS temporarily disabled)`);
  return {
    success: true,
    message: "OTP sent successfully",
    otp: otp ,
    autogent:true
  };
  
  /* Commented out Fast2SMS implementation
  try {
    const response = await axios.post(FAST2SMS_URL, payload, {
      headers: {
        authorization: FAST2SMS_API_KEY,
        'Content-Type': 'application/json',
      },
    });
    console.log('Fast2SMS Response:', response.data);
    
    return response.data;
  } catch (err) {
    console.error('Fast2SMS Error:', err.response?.data || err.message);
    throw new Error(`Failed to send OTP: ${err.response?.data?.message || err.message}`);
  }
  */
}

module.exports = { sendOtp };
