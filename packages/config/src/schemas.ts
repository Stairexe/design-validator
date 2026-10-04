import { z } from 'zod';

/**
 * Environment fragments. Each runtime composes only the fragments it needs,
 * so a worker that never touches Figma does not require Figma credentials.
 */

const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true');

export const runtimeEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export const databaseEnvSchema = z.object({
  DATABASE_URL: z
    .url()
    .refine((value) => /^postgres(ql)?:\/\//.test(value), 'must be a postgresql:// URL'),
});

export const redisEnvSchema = z.object({
  REDIS_URL: z.url().refine((value) => /^rediss?:\/\//.test(value), 'must be a redis:// URL'),
});

export const storageEnvSchema = z.discriminatedUnion('STORAGE_DRIVER', [
  z.object({
    STORAGE_DRIVER: z.literal('memory'),
  }),
  z.object({
    STORAGE_DRIVER: z.literal('filesystem'),
    STORAGE_DIR: z.string().min(1).default('.data/storage'),
  }),
  z.object({
    STORAGE_DRIVER: z.literal('vercel-blob'),
    BLOB_READ_WRITE_TOKEN: z.string().min(1),
  }),
  z.object({
    STORAGE_DRIVER: z.literal('s3'),
    S3_BUCKET: z.string().min(1),
    S3_REGION: z.string().min(1),
    S3_ENDPOINT: z.url().optional(),
    S3_FORCE_PATH_STYLE: booleanString.default(false),
    S3_ACCESS_KEY_ID: z.string().min(1).optional(),
    S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  }),
]);

export const webEnvSchema = z.object({
  APP_URL: z.url().default('http://localhost:3000'),
});

export const figmaEnvSchema = z.object({
  FIGMA_ACCESS_TOKEN: z.string().min(1).optional(),
});

export const anthropicEnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
});

export type RuntimeEnv = z.infer<typeof runtimeEnvSchema>;
export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;
export type RedisEnv = z.infer<typeof redisEnvSchema>;
export type StorageEnv = z.infer<typeof storageEnvSchema>;
export type WebEnv = z.infer<typeof webEnvSchema>;
export type FigmaEnv = z.infer<typeof figmaEnvSchema>;
export type AnthropicEnv = z.infer<typeof anthropicEnvSchema>;
