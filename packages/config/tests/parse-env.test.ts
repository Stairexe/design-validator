import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  EnvValidationError,
  databaseEnvSchema,
  parseEnv,
  redisEnvSchema,
  runtimeEnvSchema,
  storageEnvSchema,
} from '../src';

describe('parseEnv', () => {
  it('returns typed values for a valid environment', () => {
    const env = parseEnv(databaseEnvSchema.extend(redisEnvSchema.shape), {
      DATABASE_URL: 'postgresql://user:pw@localhost:5432/db',
      REDIS_URL: 'redis://localhost:6379',
    });

    expect(env).toEqual({
      DATABASE_URL: 'postgresql://user:pw@localhost:5432/db',
      REDIS_URL: 'redis://localhost:6379',
    });
  });

  it('applies defaults', () => {
    expect(parseEnv(runtimeEnvSchema, {})).toEqual({ NODE_ENV: 'development', LOG_LEVEL: 'info' });
  });

  it('treats empty strings as unset', () => {
    const schema = z.object({ OPTIONAL_TOKEN: z.string().min(1).optional() });
    expect(parseEnv(schema, { OPTIONAL_TOKEN: '' })).toEqual({});
  });

  it('reports every invalid variable without leaking values', () => {
    const secret = 'mysql://root:super-secret@db/prod';
    let caught: unknown;
    try {
      parseEnv(databaseEnvSchema.extend(redisEnvSchema.shape), { DATABASE_URL: secret });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(EnvValidationError);
    const error = caught as EnvValidationError;
    expect(error.issues).toHaveLength(2);
    expect(error.message).toContain('DATABASE_URL');
    expect(error.message).toContain('REDIS_URL');
    expect(error.message).not.toContain('super-secret');
  });
});

describe('storageEnvSchema', () => {
  it('accepts the in-memory driver without S3 settings', () => {
    expect(parseEnv(storageEnvSchema, { STORAGE_DRIVER: 'memory' })).toEqual({
      STORAGE_DRIVER: 'memory',
    });
  });

  it('requires bucket and region for the s3 driver and parses booleans', () => {
    expect(() => parseEnv(storageEnvSchema, { STORAGE_DRIVER: 's3' })).toThrow(EnvValidationError);

    expect(
      parseEnv(storageEnvSchema, {
        STORAGE_DRIVER: 's3',
        S3_BUCKET: 'artifacts',
        S3_REGION: 'us-east-1',
        S3_FORCE_PATH_STYLE: 'true',
      }),
    ).toEqual({
      STORAGE_DRIVER: 's3',
      S3_BUCKET: 'artifacts',
      S3_REGION: 'us-east-1',
      S3_FORCE_PATH_STYLE: true,
    });
  });
});
