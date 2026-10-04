import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  FileSystemObjectStorage,
  MemoryObjectStorage,
  S3ObjectStorage,
  createObjectStorage,
  objectKey,
  type ObjectStorage,
  type S3Sender,
} from '../src';

const bytes = (text: string) => new TextEncoder().encode(text);

function behavesLikeObjectStorage(name: string, create: () => ObjectStorage) {
  describe(`${name} contract`, () => {
    it('round-trips bytes and content type', async () => {
      const storage = create();
      await storage.put({
        key: 'a/b.json',
        body: bytes('{"ok":true}'),
        contentType: 'application/json',
      });

      const stored = await storage.get('a/b.json');
      expect(stored).not.toBeNull();
      expect(new TextDecoder().decode(stored?.body)).toBe('{"ok":true}');
      expect(stored?.contentType).toBe('application/json');
    });

    it('lists keys by prefix in order', async () => {
      const storage = create();
      for (const key of ['db/b.json', 'db/a.json', 'other/c.json']) {
        await storage.put({ key, body: bytes('x'), contentType: 'application/json' });
      }
      expect(await storage.list('db/')).toEqual(['db/a.json', 'db/b.json']);
    });

    it('returns null for missing keys and deletes idempotently', async () => {
      const storage = create();
      await storage.put({ key: 'k', body: bytes('x'), contentType: 'text/plain' });
      await storage.delete('k');
      await storage.delete('k');

      expect(await storage.get('k')).toBeNull();
    });
  });
}

/** Fake S3 that understands the three commands the adapter issues. */
function fakeS3(): S3Sender {
  const objects = new Map<string, { body: Uint8Array; contentType: string | undefined }>();
  const send = (command: unknown): Promise<unknown> => {
    if (command instanceof PutObjectCommand) {
      const { Key, Body, ContentType } = command.input;
      objects.set(String(Key), { body: Body as Uint8Array, contentType: ContentType });
      return Promise.resolve({});
    }
    if (command instanceof GetObjectCommand) {
      const stored = objects.get(String(command.input.Key));
      if (!stored) {
        return Promise.reject(new NoSuchKey({ message: 'missing', $metadata: {} }));
      }
      return Promise.resolve({
        Body: { transformToByteArray: () => Promise.resolve(stored.body) },
        ContentType: stored.contentType,
      });
    }
    if (command instanceof ListObjectsV2Command) {
      const prefix = command.input.Prefix ?? '';
      return Promise.resolve({
        Contents: [...objects.keys()].filter((k) => k.startsWith(prefix)).map((Key) => ({ Key })),
        IsTruncated: false,
      });
    }
    if (command instanceof DeleteObjectCommand) {
      objects.delete(String(command.input.Key));
      return Promise.resolve({});
    }
    return Promise.reject(new Error('unexpected command'));
  };
  return { send } as S3Sender;
}

behavesLikeObjectStorage('MemoryObjectStorage', () => new MemoryObjectStorage());
behavesLikeObjectStorage(
  'FileSystemObjectStorage',
  () => new FileSystemObjectStorage(mkdtempSync(path.join(tmpdir(), 'dv-storage-'))),
);

describe('FileSystemObjectStorage', () => {
  it('rejects keys escaping the root', async () => {
    const storage = new FileSystemObjectStorage(mkdtempSync(path.join(tmpdir(), 'dv-storage-')));
    await expect(
      storage.put({ key: '../escape.txt', body: bytes('x'), contentType: 'text/plain' }),
    ).rejects.toThrow(/escapes/);
  });
});
behavesLikeObjectStorage('S3ObjectStorage', () => new S3ObjectStorage(fakeS3(), 'bucket'));

describe('createObjectStorage', () => {
  it('creates the configured driver', () => {
    expect(createObjectStorage({ STORAGE_DRIVER: 'memory' })).toBeInstanceOf(MemoryObjectStorage);
    expect(
      createObjectStorage({
        STORAGE_DRIVER: 's3',
        S3_BUCKET: 'bucket',
        S3_REGION: 'us-east-1',
        S3_FORCE_PATH_STYLE: true,
      }),
    ).toBeInstanceOf(S3ObjectStorage);
  });
});

describe('objectKey', () => {
  it('joins safe segments', () => {
    expect(objectKey('audits', 'audit_1', 'desktop', 'screenshot.png')).toBe(
      'audits/audit_1/desktop/screenshot.png',
    );
  });

  it('allows Figma-style node IDs', () => {
    expect(objectKey('audits', 'a1', '1:2')).toBe('audits/a1/1:2');
  });

  it.each(['', '..', '../x', 'a/b', '.hidden', 'a..b'])('rejects %j', (segment) => {
    expect(() => objectKey('audits', segment)).toThrow();
  });
});
