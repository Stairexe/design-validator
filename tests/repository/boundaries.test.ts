import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { ALL_QUEUE_NAMES } from '@design-validator/jobs';
import { describe, expect, it } from 'vitest';

/**
 * Enforces the package boundaries from CLAUDE.md / file-structure.md.
 * Each workspace package may only depend on the internal packages listed
 * here. Changing this matrix is an architectural decision: document why.
 */
const SHARED_INFRA = [
  '@design-validator/config',
  '@design-validator/database',
  '@design-validator/design-spec',
  '@design-validator/jobs',
  '@design-validator/storage',
];

const ALLOWED_INTERNAL_DEPENDENCIES: Record<string, readonly string[]> = {
  // Foundation
  '@design-validator/design-spec': [],
  '@design-validator/config': [],
  '@design-validator/storage': ['@design-validator/config'],
  '@design-validator/jobs': ['@design-validator/config'],
  '@design-validator/database': [],

  // Domain: everything speaks DesignSpec; source-specific code never reaches matcher/comparator.
  '@design-validator/web-inspector': ['@design-validator/design-spec'],
  '@design-validator/figma-parser': ['@design-validator/design-spec'],
  '@design-validator/xd-parser': ['@design-validator/design-spec'],
  '@design-validator/matcher': ['@design-validator/design-spec'],
  '@design-validator/comparator': ['@design-validator/design-spec'],
  '@design-validator/ai': ['@design-validator/design-spec'],

  // Workers orchestrate one domain package each on top of shared infrastructure.
  '@design-validator/worker-website-inspection': [
    ...SHARED_INFRA,
    '@design-validator/web-inspector',
  ],
  '@design-validator/worker-figma-import': [...SHARED_INFRA, '@design-validator/figma-parser'],
  '@design-validator/worker-xd-import': [...SHARED_INFRA, '@design-validator/xd-parser'],
  '@design-validator/worker-comparison': [
    ...SHARED_INFRA,
    '@design-validator/matcher',
    '@design-validator/comparator',
  ],
  '@design-validator/worker-visual-diff': SHARED_INFRA,
  '@design-validator/worker-ai-explanation': [...SHARED_INFRA, '@design-validator/ai'],
  '@design-validator/worker-cleanup': SHARED_INFRA,

  // The UI enqueues jobs and reads results; it never runs inspection or comparison itself.
  '@design-validator/web': SHARED_INFRA,
};

const root = path.resolve(import.meta.dirname, '../..');

interface WorkspacePackage {
  dir: string;
  name: string;
  private?: boolean;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function readWorkspacePackages(): WorkspacePackage[] {
  return ['apps', 'packages', 'workers'].flatMap((group) =>
    readdirSync(path.join(root, group), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(group, entry.name))
      .filter((dir) => existsSync(path.join(root, dir, 'package.json')))
      .map((dir) => ({
        dir,
        ...(JSON.parse(readFileSync(path.join(root, dir, 'package.json'), 'utf8')) as Omit<
          WorkspacePackage,
          'dir'
        >),
      })),
  );
}

const packages = readWorkspacePackages();

describe('workspace package boundaries', () => {
  it('classifies every workspace package', () => {
    expect(packages.map((pkg) => pkg.name).sort()).toEqual(
      Object.keys(ALLOWED_INTERNAL_DEPENDENCIES).sort(),
    );
  });

  it.each(packages.map((pkg) => [pkg.name, pkg] as const))(
    '%s only depends on allowed internal packages',
    (name, pkg) => {
      const internal = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).filter((dep) =>
        dep.startsWith('@design-validator/'),
      );
      const allowed = ALLOWED_INTERNAL_DEPENDENCIES[name] ?? [];
      expect(internal.filter((dep) => !allowed.includes(dep))).toEqual([]);
    },
  );

  it.each(packages.map((pkg) => [pkg.name, pkg] as const))(
    '%s is private and type-checked',
    (_name, pkg) => {
      expect(pkg.private).toBe(true);
      expect(pkg.scripts?.['typecheck']).toBeDefined();
    },
  );
});

describe('worker layout', () => {
  it('has exactly one worker package per queue', () => {
    const workerDirs = packages
      .filter((pkg) => pkg.dir.startsWith('workers'))
      .map((pkg) => path.basename(pkg.dir))
      .sort();
    expect(workerDirs).toEqual([...ALL_QUEUE_NAMES].sort());
  });
});

describe('secrets hygiene', () => {
  it('ignores env files and macOS metadata', () => {
    const gitignore = readFileSync(path.join(root, '.gitignore'), 'utf8').split('\n');
    expect(gitignore).toEqual(
      expect.arrayContaining(['.env', '.env.*', '!.env.example', '.DS_Store']),
    );
  });
});
