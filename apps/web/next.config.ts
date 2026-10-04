import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Single env strategy: every runtime reads the git-ignored root `.env`.
loadEnvConfig(repositoryRoot);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Native/binary-heavy server dependencies are loaded from node_modules at runtime.
  serverExternalPackages: [
    'playwright-core',
    '@sparticuz/chromium',
    '@prisma/client',
    '@prisma/adapter-pg',
    'pg',
    'bullmq',
    'ioredis',
  ],
  // Serverless Chromium ships its compressed binary as data files: include them in the audit routes' bundles.
  outputFileTracingIncludes: {
    '/api/audits': [
      '../../node_modules/.pnpm/@sparticuz+chromium@*/node_modules/@sparticuz/chromium/bin/**',
    ],
    '/api/samples': [
      '../../node_modules/.pnpm/@sparticuz+chromium@*/node_modules/@sparticuz/chromium/bin/**',
    ],
  },
  outputFileTracingRoot: repositoryRoot,
  turbopack: {
    root: repositoryRoot,
  },
};

export default nextConfig;
