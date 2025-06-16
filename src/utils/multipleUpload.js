const { PutObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const r2 = require('../config/r2.config');

async function uploadMultipleToR2(files, folderName) {
  try {
    const uploadPromises = files.map((file) => {
      const ext = path.extname(file.originalname);
      const key = `${folderName}/${uuidv4()}${ext}`;
      const params = {
        Bucket: 'toimpress',
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      };
      return r2
        .send(new PutObjectCommand(params))
        .then(() => `https://pub-${process.env.CF_R2_PUBLIC_BUCKET_ID}.r2.dev/${key}`)
        .catch((err) => {
          console.error(`Failed to upload ${file.originalname} to R2:`, err);
          throw new Error(`Upload failed for ${file.originalname}`);
        });
    });

    return await Promise.all(uploadPromises);
  } catch (err) {
    console.error('Batch upload failed:', err);
    throw new Error('Multiple file upload failed');
  }
}

module.exports = { uploadMultipleToR2 };
