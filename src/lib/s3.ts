import 'server-only';

import { S3Client } from '@aws-sdk/client-s3';

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing_env:${name}`);
  return v;
}

export function getStudentResourcesBucket(): string {
  return process.env.S3_BUCKET_STUDENT_RESOURCES || 'cloudai-student-resources';
}

export function isS3Configured(): { ok: true } | { ok: false; missing: string[] } {
  const missing: string[] = [];
  for (const k of ['S3_ENDPOINT', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY']) {
    if (!process.env[k]) missing.push(k);
  }
  return missing.length ? { ok: false, missing } : { ok: true };
}

export function getS3Client(): S3Client {
  const endpoint = requiredEnv('S3_ENDPOINT');
  const region = process.env.S3_REGION || 'us-east-1';
  const forcePathStyle = String(process.env.S3_FORCE_PATH_STYLE || '').toLowerCase() === 'true';

  const accessKeyId = requiredEnv('S3_ACCESS_KEY_ID');
  const secretAccessKey = requiredEnv('S3_SECRET_ACCESS_KEY');

  return new S3Client({
    endpoint,
    region,
    forcePathStyle,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export function getS3PresignClient(): S3Client {
  const endpoint = process.env.S3_PUBLIC_ENDPOINT || requiredEnv('S3_ENDPOINT');
  const region = process.env.S3_REGION || 'us-east-1';
  const forcePathStyle = String(process.env.S3_FORCE_PATH_STYLE || '').toLowerCase() === 'true';

  const accessKeyId = requiredEnv('S3_ACCESS_KEY_ID');
  const secretAccessKey = requiredEnv('S3_SECRET_ACCESS_KEY');

  return new S3Client({
    endpoint,
    region,
    forcePathStyle,
    credentials: { accessKeyId, secretAccessKey },
  });
}
