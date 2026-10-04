import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { ObjectStorage, PutObjectInput, StoredObject } from './object-storage';

/**
 * Local-disk storage for single-machine development and self-hosting. Keys map
 * to paths under `root`; keys are validated to stay inside it.
 */
export class FileSystemObjectStorage implements ObjectStorage {
  readonly #root: string;

  constructor(root: string) {
    this.#root = path.resolve(root);
  }

  #path(key: string): string {
    const resolved = path.resolve(this.#root, key);
    if (!resolved.startsWith(`${this.#root}${path.sep}`))
      throw new Error(`Object key escapes the storage root: ${key}`);
    return resolved;
  }

  async put({ key, body, contentType }: PutObjectInput): Promise<void> {
    const file = this.#path(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
    await writeFile(`${file}.meta`, contentType);
  }

  async get(key: string): Promise<StoredObject | null> {
    const file = this.#path(key);
    try {
      const body = new Uint8Array(await readFile(file));
      const contentType = await readFile(`${file}.meta`, 'utf8').catch(() => undefined);
      return { body, contentType };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    const file = this.#path(key);
    await rm(file, { force: true });
    await rm(`${file}.meta`, { force: true });
  }

  async list(prefix: string): Promise<string[]> {
    const entries = await readdir(this.#root, { recursive: true, withFileTypes: true }).catch(
      () => [],
    );
    return entries
      .filter((entry) => entry.isFile() && !entry.name.endsWith('.meta'))
      .map((entry) =>
        path
          .relative(this.#root, path.join(entry.parentPath, entry.name))
          .split(path.sep)
          .join('/'),
      )
      .filter((key) => key.startsWith(prefix))
      .sort();
  }
}
