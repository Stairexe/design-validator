/**
 * Storage for large audit artifacts (screenshots, normalized DesignSpec
 * snapshots, report JSON). Relational rows only keep the object key.
 */
export interface PutObjectInput {
  key: string;
  body: Uint8Array;
  contentType: string;
}

export interface StoredObject {
  body: Uint8Array;
  contentType: string | undefined;
}

export interface ObjectStorage {
  put(input: PutObjectInput): Promise<void>;
  /** Returns `null` when the key does not exist. */
  get(key: string): Promise<StoredObject | null>;
  /** Deleting a missing key is not an error, so retries stay idempotent. */
  delete(key: string): Promise<void>;
  /** All keys starting with `prefix`, sorted ascending. */
  list(prefix: string): Promise<string[]>;
}

const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

/**
 * Builds an object key from trusted path segments, rejecting anything that
 * could escape its prefix (`..`, slashes, empty segments).
 */
export function objectKey(...segments: string[]): string {
  if (segments.length === 0) {
    throw new Error('objectKey requires at least one segment');
  }
  for (const segment of segments) {
    if (!SAFE_SEGMENT.test(segment) || segment.includes('..')) {
      throw new Error(`Invalid object key segment: ${JSON.stringify(segment)}`);
    }
  }
  return segments.join('/');
}
