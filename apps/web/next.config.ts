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
  turbopack: {
    root: repositoryRoot,
  },
};

export default nextConfig;
