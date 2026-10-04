import { S3Client } from '@aws-sdk/client-s3';
import type { StorageEnv } from '@design-validator/config';

import { FileSystemObjectStorage } from './filesystem-storage';
import { MemoryObjectStorage } from './memory-storage';
import type { ObjectStorage } from './object-storage';
import { S3ObjectStorage } from './s3-storage';
import { VercelBlobObjectStorage } from './vercel-blob-storage';

/** Creates the configured storage driver from validated environment values. */
export function createObjectStorage(env: StorageEnv): ObjectStorage {
  if (env.STORAGE_DRIVER === 'memory') {
    return new MemoryObjectStorage();
  }
  if (env.STORAGE_DRIVER === 'filesystem') {
    return new FileSystemObjectStorage(env.STORAGE_DIR);
  }
  if (env.STORAGE_DRIVER === 'vercel-blob') {
    return new VercelBlobObjectStorage(env.BLOB_READ_WRITE_TOKEN);
  }

  const credentials =
    env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
      ? { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY }
      : undefined;

  const client = new S3Client({
    region: env.S3_REGION,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
    // Without explicit keys the SDK falls back to its default credential chain.
    ...(credentials ? { credentials } : {}),
  });
  return new S3ObjectStorage(client, env.S3_BUCKET);
}
