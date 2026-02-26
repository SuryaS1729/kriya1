#!/usr/bin/env node
// scripts/clear-r2.js — Delete all objects from R2 bucket

const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.R2_BUCKET_NAME || 'kriya';

async function clearBucket() {
  let total = 0;
  let continuation;
  do {
    const list = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      ContinuationToken: continuation,
    }));
    if (!list.Contents || list.Contents.length === 0) break;
    const keys = list.Contents.map(o => ({ Key: o.Key }));
    await s3.send(new DeleteObjectsCommand({ Bucket: BUCKET, Delete: { Objects: keys } }));
    total += keys.length;
    console.log(`Deleted batch of ${keys.length} objects...`);
    continuation = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (continuation);
  console.log(`\n✅ Deleted ${total} total objects from bucket: ${BUCKET}`);
}

clearBucket().catch(e => { console.error(e); process.exit(1); });
