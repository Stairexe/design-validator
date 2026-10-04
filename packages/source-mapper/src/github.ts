export interface GitHubRepository {
  owner: string;
  repo: string;
  ref: string;
}

export interface GitHubSourceOptions {
  fetch?: typeof fetch;
  /** Optional token; raises GitHub's anonymous rate limit. */
  token?: string | undefined;
  maxFiles?: number;
  maxFileBytes?: number;
}

const STYLE_FILE = /\.(css|scss|sass|less)$/i;
const EXCLUDED = /(^|\/)(node_modules|dist|build|out|\.next|vendor|coverage)\//;
const SAFE_NAME = /^[A-Za-z0-9_.-]+$/;

export class SourceRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SourceRepositoryError';
  }
}

/** Reads stylesheets from a public GitHub repository (read-only). */
export async function fetchGitHubStylesheets(
  repository: GitHubRepository,
  options: GitHubSourceOptions = {},
): Promise<{ path: string; content: string; url: string }[]> {
  const { owner, repo, ref } = repository;
  if (
    !SAFE_NAME.test(owner) ||
    !SAFE_NAME.test(repo) ||
    !/^[\w./-]+$/.test(ref) ||
    ref.includes('..')
  ) {
    throw new SourceRepositoryError('Invalid repository name or ref.');
  }
  const doFetch = options.fetch ?? fetch;
  const headers: Record<string, string> = {
    accept: 'application/vnd.github+json',
    'user-agent': 'design-validator',
  };
  if (options.token) headers['authorization'] = `Bearer ${options.token}`;

  const treeResponse = await doFetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
    { headers, signal: AbortSignal.timeout(20_000) },
  );
  if (treeResponse.status === 404)
    throw new SourceRepositoryError(
      `Repository ${owner}/${repo}@${ref} was not found or is private.`,
    );
  if (treeResponse.status === 403 || treeResponse.status === 429)
    throw new SourceRepositoryError(
      'GitHub rate limit reached; try again later or configure GITHUB_TOKEN.',
    );
  if (!treeResponse.ok)
    throw new SourceRepositoryError(`GitHub responded with HTTP ${treeResponse.status}.`);
  const tree = (await treeResponse.json()) as {
    tree?: { path: string; type: string; size?: number }[];
  };

  const maxBytes = options.maxFileBytes ?? 500_000;
  const paths = (tree.tree ?? [])
    .filter(
      (entry) =>
        entry.type === 'blob' &&
        STYLE_FILE.test(entry.path) &&
        !EXCLUDED.test(entry.path) &&
        !entry.path.endsWith('.min.css') &&
        (entry.size ?? 0) <= maxBytes,
    )
    .map((entry) => entry.path)
    .slice(0, options.maxFiles ?? 150);

  const files = await Promise.all(
    paths.map(async (path) => {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(ref)}/${path.split('/').map(encodeURIComponent).join('/')}`;
      const response = await doFetch(rawUrl, {
        headers: options.token ? { authorization: `Bearer ${options.token}` } : {},
        signal: AbortSignal.timeout(20_000),
      });
      return response.ok
        ? {
            path,
            content: await response.text(),
            url: `https://github.com/${owner}/${repo}/blob/${ref}/${path}`,
          }
        : null;
    }),
  );
  return files.filter(
    (file): file is { path: string; content: string; url: string } => file !== null,
  );
}
