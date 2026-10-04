import { parseEnv, storageEnvSchema } from '@design-validator/config';
import { createClaudeModel } from '@design-validator/ai';
import { createAuditRepository } from '@design-validator/database';
import { createLogger } from '@design-validator/jobs';
import {
  MemoryObjectStorage,
  createObjectStorage,
  type ObjectStorage,
} from '@design-validator/storage';
import { defaultBrowserProvider } from '@design-validator/web-inspector';
import { z } from 'zod';

import type { PipelineDependencies } from './deps';

const runtimeSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DATABASE_URL: z.url().optional(),
  REDIS_URL: z.url().optional(),
  AUDIT_EXECUTION: z.enum(['inline', 'queue']).optional(),
  INSPECTOR_ALLOW_PRIVATE_HOSTS: z.enum(['true', 'false']).default('false'),
  FIGMA_ACCESS_TOKEN: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_MODEL: z.string().min(1).optional(),
  GITHUB_TOKEN: z.string().min(1).optional(),
});

/**
 * On Vercel with "Protection Bypass for Automation" enabled, lets the inspector
 * open this deployment's own protected URLs (e.g. the bundled sample page).
 * The secret is attached only to these exact origins.
 */
function vercelSelfHeaders(
  env: NodeJS.ProcessEnv,
): Record<string, Record<string, string>> | undefined {
  const secret = env['VERCEL_AUTOMATION_BYPASS_SECRET'];
  if (!secret) return undefined;
  const hosts = [
    env['VERCEL_URL'],
    env['VERCEL_BRANCH_URL'],
    env['VERCEL_PROJECT_PRODUCTION_URL'],
  ].filter((host): host is string => Boolean(host));
  return Object.fromEntries(
    hosts.map((host) => [`https://${host}`, { 'x-vercel-protection-bypass': secret }]),
  );
}

export interface PipelineRuntime {
  deps: PipelineDependencies;
  execution: 'inline' | 'queue';
  redisUrl: string | undefined;
}

// Bundlers may load this module more than once per process (e.g. Next.js
// route handlers and pages); the in-memory store must still be shared.
const globalStore = globalThis as typeof globalThis & {
  __designValidatorMemoryStorage?: ObjectStorage;
};

/**
 * Composition root shared by the web app and workers: builds pipeline
 * dependencies from validated environment variables.
 */
export function createRuntime(
  env: NodeJS.ProcessEnv = process.env,
  service = 'pipeline',
): PipelineRuntime {
  const config = parseEnv(runtimeSchema, env);
  const storage = env['STORAGE_DRIVER']
    ? createObjectStorage(parseEnv(storageEnvSchema, env))
    : // No storage configured: in-process memory (single-process development only).
      (globalStore.__designValidatorMemoryStorage ??= new MemoryObjectStorage());
  const execution = config.AUDIT_EXECUTION ?? 'inline';
  if (execution === 'queue' && !config.REDIS_URL) {
    throw new Error('AUDIT_EXECUTION=queue requires REDIS_URL.');
  }
  return {
    execution,
    redisUrl: config.REDIS_URL,
    deps: {
      repository: createAuditRepository({ databaseUrl: config.DATABASE_URL, storage }),
      storage,
      browserProvider: defaultBrowserProvider(),
      logger: createLogger({ service }, { level: config.LOG_LEVEL }),
      allowPrivateHosts: config.INSPECTOR_ALLOW_PRIVATE_HOSTS === 'true',
      figmaAccessToken: config.FIGMA_ACCESS_TOKEN,
      githubToken: config.GITHUB_TOKEN,
      inspectionOriginHeaders: vercelSelfHeaders(env),
      recommendationModel: config.ANTHROPIC_API_KEY
        ? createClaudeModel({ apiKey: config.ANTHROPIC_API_KEY, model: config.ANTHROPIC_MODEL })
        : undefined,
    },
  };
}
