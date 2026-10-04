import { parseDesignSpec } from '@design-validator/design-spec';
import { PipelineError } from '@design-validator/jobs';
import {
  SourceRepositoryError,
  fetchGitHubStylesheets,
  locateDeclarations,
  type SourceMatch,
} from '@design-validator/source-mapper';
import { objectKey } from '@design-validator/storage';

import { artifactKeys, getJson, putJson } from './artifacts';
import type { PipelineDependencies } from './deps';

const CACHE_TTL_MS = 10 * 60 * 1000;

export interface IssueSourceResult {
  repository: { owner: string; repo: string; ref: string };
  matches: (SourceMatch & { url: string })[];
  filesSearched: number;
}

type CachedFiles = { fetchedAt: number; files: { path: string; content: string; url: string }[] };

/**
 * Phase 10: locates the CSS that styles an issue's element in the project's
 * GitHub repository and proposes a patch setting the required value.
 */
export async function locateIssueSource(
  deps: PipelineDependencies,
  auditId: string,
  issueId: string,
): Promise<IssueSourceResult> {
  const audit = await deps.repository.getAudit(auditId);
  const project = audit ? await deps.repository.getProject(audit.projectId) : null;
  if (!audit || !project) throw new PipelineError('SOURCE_MAPPING_FAILED', 'Audit not found.');
  const repository = project.sourceRepository;
  if (!repository)
    throw new PipelineError(
      'SOURCE_MAPPING_FAILED',
      'Connect a GitHub repository to the project first.',
    );
  const issue = await deps.repository.getIssue(auditId, issueId);
  if (!issue?.element.implementationId)
    throw new PipelineError(
      'SOURCE_MAPPING_FAILED',
      'This issue has no implementation element to locate.',
    );

  const spec = parseDesignSpec(
    await getJson(deps.storage, artifactKeys.websiteSpec(auditId, issue.viewportId)),
  );
  const element = spec.pages[0]?.elements.find(
    (candidate) => candidate.id === issue.element.implementationId,
  );
  if (!element)
    throw new PipelineError(
      'SOURCE_MAPPING_FAILED',
      'The implementation element is missing from the stored measurements.',
    );

  const cacheKey = objectKey(
    'source-cache',
    repository.owner,
    repository.repo,
    `${repository.ref.replace(/[^\w.-]/g, '_')}.json`,
  );
  let cached = (await getJson(deps.storage, cacheKey)) as CachedFiles | null;
  if (!cached || Date.now() - cached.fetchedAt > CACHE_TTL_MS) {
    try {
      const files = await fetchGitHubStylesheets(repository, {
        ...(deps.fetch ? { fetch: deps.fetch } : {}),
        token: deps.githubToken,
      });
      cached = { fetchedAt: Date.now(), files };
      await putJson(deps.storage, cacheKey, cached);
    } catch (error) {
      throw new PipelineError(
        'SOURCE_MAPPING_FAILED',
        error instanceof SourceRepositoryError ? error.message : 'Could not read the repository.',
        { cause: error },
      );
    }
  }

  const viewport = audit.viewports.find((candidate) => candidate.id === issue.viewportId);
  const urls = new Map(cached.files.map((file) => [file.path, file.url]));
  const matches = locateDeclarations(
    cached.files,
    {
      tag: element.source.originalType ?? 'div',
      id: element.source.attributes?.['id'],
      classes: element.source.classNames ?? [],
    },
    issue,
    { viewportWidth: viewport?.width ?? 1440 },
  ).map((match) => ({ ...match, url: `${urls.get(match.path) ?? ''}#L${match.line}` }));
  return { repository, matches, filesSearched: cached.files.length };
}
