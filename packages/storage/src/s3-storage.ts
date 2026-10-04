import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3';

import type { ObjectStorage, PutObjectInput, StoredObject } from './object-storage';

/** Minimal surface of `S3Client` used here, so tests can supply a fake. */
export type S3Sender = Pick<S3Client, 'send'>;

/** Works with any S3-compatible service (AWS S3, MinIO, Cloudflare R2, ...). */
export class S3ObjectStorage implements ObjectStorage {
  readonly #client: S3Sender;
  readonly #bucket: string;

  constructor(client: S3Sender, bucket: string) {
    this.#client = client;
    this.#bucket = bucket;
  }

  async put({ key, body, contentType }: PutObjectInput): Promise<void> {
    await this.#client.send(
      new PutObjectCommand({
        Bucket: this.#bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async get(key: string): Promise<StoredObject | null> {
    try {
      const response = await this.#client.send(
        new GetObjectCommand({ Bucket: this.#bucket, Key: key }),
      );
      if (!response.Body) {
        return null;
      }
      return {
        body: await response.Body.transformToByteArray(),
        contentType: response.ContentType,
      };
    } catch (error) {
      if (error instanceof NoSuchKey) {
        return null;
      }
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await this.#client.send(new DeleteObjectCommand({ Bucket: this.#bucket, Key: key }));
  }
}
