import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';

// The pipeline runs in these routes (inline mode); include serverless Chromium's binaries.
const CHROMIUM_BIN =
  '../../node_modules/.pnpm/@sparticuz+chromium@*/node_modules/@sparticuz/chromium/bin/**';

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
  outputFileTracingIncludes: Object.fromEntries(
    ['/api/audits', '/api/samples', '/api/audits/[auditId]/revalidate'].map((route) => [
      route,
      [CHROMIUM_BIN],
    ]),
  ),
  outputFileTracingRoot: repositoryRoot,
  headers() {
    return Promise.resolve([
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
    ]);
  },
  turbopack: {
    root: repositoryRoot,
  },
};

export default nextConfig;
