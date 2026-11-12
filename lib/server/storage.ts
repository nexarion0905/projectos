import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { HttpError } from './http';

let client: S3Client | undefined;

function storage() {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!endpoint || !region || !accessKeyId || !secretAccessKey) throw new Error('Neon Object Storage is not configured.');
  client ??= new S3Client({ endpoint, region, forcePathStyle: true, credentials: { accessKeyId, secretAccessKey } });
  return client;
}

export function safeObjectKey(value: string) {
  const key = value.trim();
  if (!key || key.length > 512 || key.startsWith('/') || key.includes('..') || key.includes('\\') || !/^[a-zA-Z0-9._/-]+$/.test(key)) throw new Error('Object key is invalid.');
  return key;
}

export async function createUploadUrl(key: string, contentType: string, byteSize: number) {
  if (!['application/json', 'application/pdf', 'text/plain'].includes(contentType)) {
    throw new HttpError(400, 'Unsupported content type.');
  }
  const bucket = process.env.NEON_STORAGE_BUCKET;
  if (!bucket) throw new Error('NEON_STORAGE_BUCKET is not configured.');
  return getSignedUrl(storage(), new PutObjectCommand({
    Bucket: bucket, Key: safeObjectKey(key), ContentType: contentType, ContentLength: byteSize, IfNoneMatch: '*',
  }), { expiresIn: 60, signableHeaders: new Set(['content-type', 'content-length', 'if-none-match']) });
}

