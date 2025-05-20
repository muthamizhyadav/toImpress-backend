const { PutObjectCommand } = require('@aws-sdk/client-s3');
const r2 = require('../config/r2.config');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
/**
 * Upload file to Cloudflare R2
 * @param {Buffer} buffer - File buffer
 * @param {string} key - File name or path in R2 (e.g., "folder/image.jpg")
 * @param {string} contentType - MIME type of the file (e.g., "image/png")
 * @returns {Promise<string>} - Returns R2 public URL on success
 */

async function uploadToR2(buffer, originalName, contentType, folderName) {
  const ext = path.extname(originalName);
  const key = `${folderName}/${uuidv4()}${ext}`;
  const params = {
    Bucket: 'toimpress',
    Key: key,
    Body: buffer,
    ContentType: contentType,
  };

  try {
    await r2.send(new PutObjectCommand(params));
    const publicUrl = `https://pub-${process.env.CF_R2_PUBLIC_BUCKET_ID}.r2.dev/${key}`;
    return publicUrl;
  } catch (err) {
    console.error('Failed to upload to R2:', err);
    throw new Error('R2 upload failed');
  }
}

module.exports = uploadToR2;
