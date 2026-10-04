import type { ObjectStorage, PutObjectInput, StoredObject } from './object-storage';

/** In-process storage for tests and quick local runs. Not durable. */
export class MemoryObjectStorage implements ObjectStorage {
  readonly #objects = new Map<string, StoredObject>();

  put({ key, body, contentType }: PutObjectInput): Promise<void> {
    this.#objects.set(key, { body: body.slice(), contentType });
    return Promise.resolve();
  }

  get(key: string): Promise<StoredObject | null> {
    const stored = this.#objects.get(key);
    return Promise.resolve(stored ? { ...stored, body: stored.body.slice() } : null);
  }

  delete(key: string): Promise<void> {
    this.#objects.delete(key);
    return Promise.resolve();
  }
}
