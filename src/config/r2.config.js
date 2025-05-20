const { S3Client } = require('@aws-sdk/client-s3');
const config = require('./config');

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${config.s3.ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: config.s3.ACCESS_KEY_ID,
    secretAccessKey: config.s3.SECRET_KEY_ACCESS,
  },
});

module.exports = r2;
