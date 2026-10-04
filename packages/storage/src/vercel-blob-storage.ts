import { del, get, list, put } from '@vercel/blob';

import type { ObjectStorage, PutObjectInput, StoredObject } from './object-storage';

/**
 * Vercel Blob in private mode: artifacts are never publicly addressable and
 * are served through authenticated application routes.
 */
export class VercelBlobObjectStorage implements ObjectStorage {
  readonly #token: string;

  constructor(token: string) {
    this.#token = token;
  }

  async put({ key, body, contentType }: PutObjectInput): Promise<void> {
    await put(key, Buffer.from(body), {
      access: 'private',
      contentType,
      token: this.#token,
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60,
    });
  }

  async get(key: string): Promise<StoredObject | null> {
    // Audit documents are mutable: bypass the CDN cache.
    const result = await get(key, { access: 'private', token: this.#token, useCache: false });
    if (!result || result.statusCode !== 200) return null;
    const body = new Uint8Array(await new Response(result.stream).arrayBuffer());
    return { body, contentType: result.blob.contentType };
  }

  async delete(key: string): Promise<void> {
    await del(key, { token: this.#token });
  }

  async list(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({
        prefix,
        token: this.#token,
        limit: 1000,
        ...(cursor ? { cursor } : {}),
      });
      keys.push(...page.blobs.map((blob) => blob.pathname));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return keys.sort();
  }
}
