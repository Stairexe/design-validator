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

const PIPELINE = '@design-validator/pipeline';

const ALLOWED_INTERNAL_DEPENDENCIES: Record<string, readonly string[]> = {
  // Foundation
  '@design-validator/design-spec': [],
  '@design-validator/config': [],
  '@design-validator/storage': ['@design-validator/config'],
  '@design-validator/jobs': ['@design-validator/config'],
  '@design-validator/database': ['@design-validator/design-spec', '@design-validator/storage'],

  // Domain: everything speaks DesignSpec; source-specific code never reaches matcher/comparator.
  '@design-validator/web-inspector': ['@design-validator/design-spec'],
  '@design-validator/figma-parser': ['@design-validator/design-spec'],
  '@design-validator/xd-parser': ['@design-validator/design-spec'],
  '@design-validator/matcher': ['@design-validator/design-spec'],
  '@design-validator/comparator': ['@design-validator/design-spec'],
  '@design-validator/visual-diff': ['@design-validator/design-spec'],
  '@design-validator/ai': ['@design-validator/design-spec'],
  '@design-validator/source-mapper': ['@design-validator/design-spec'],

  // Orchestration: the only package that composes the domain packages.
  '@design-validator/pipeline': [
    ...SHARED_INFRA,
    '@design-validator/web-inspector',
    '@design-validator/figma-parser',
    '@design-validator/xd-parser',
    '@design-validator/matcher',
    '@design-validator/comparator',
    '@design-validator/visual-diff',
    '@design-validator/ai',
    '@design-validator/source-mapper',
  ],

  // Workers are transport only: queue consumers around pipeline stage functions.
  '@design-validator/worker-website-inspection': [...SHARED_INFRA, PIPELINE],
  '@design-validator/worker-figma-import': [...SHARED_INFRA, PIPELINE],
  '@design-validator/worker-xd-import': [...SHARED_INFRA, PIPELINE],
  '@design-validator/worker-comparison': [...SHARED_INFRA, PIPELINE],
  '@design-validator/worker-visual-diff': [...SHARED_INFRA, PIPELINE],
  '@design-validator/worker-ai-explanation': [...SHARED_INFRA, PIPELINE],
  '@design-validator/worker-cleanup': [...SHARED_INFRA, PIPELINE],

  // The UI talks to the pipeline's services and reads results; it never imports
  // inspection, matching or comparison internals directly.
  '@design-validator/web': [...SHARED_INFRA, PIPELINE],
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
    const unclassified = packages
      .map((pkg) => pkg.name)
      .filter((name) => !(name in ALLOWED_INTERNAL_DEPENDENCIES));
    expect(unclassified).toEqual([]);
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
