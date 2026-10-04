import {
  buildReport,
  compareViewport,
  type ViewportComparison,
} from '@design-validator/comparator';
import type { AuditRecord } from '@design-validator/database';
import {
  DEFAULT_TOLERANCES,
  parseDesignSpec,
  type DesignSpec,
  type ValidationReport,
} from '@design-validator/design-spec';
import { PipelineError } from '@design-validator/jobs';
import { matchElements } from '@design-validator/matcher';

import { artifactKeys, getJson, putJson } from '../artifacts';
import type { PipelineDependencies } from '../deps';
import { withStageRun } from './stage-run';

/** MATCHING + COMPARING for every viewport; stores the report and searchable issues. */
export async function runComparison(
  deps: PipelineDependencies,
  audit: AuditRecord,
): Promise<ValidationReport> {
  const design = parseDesignSpec(await getJson(deps.storage, artifactKeys.designSpec(audit.id)));
  const websites = new Map<string, DesignSpec>();
  for (const viewport of audit.viewports) {
    const raw = await getJson(deps.storage, artifactKeys.websiteSpec(audit.id, viewport.id));
    if (!raw)
      throw new PipelineError(
        'COMPARISON_FAILED',
        `Website measurements for ${viewport.id} are missing.`,
      );
    websites.set(viewport.id, parseDesignSpec(raw));
  }

  const matched = await withStageRun(deps, audit, 'MATCHING', null, () => {
    const result = audit.viewports.map((viewport) => {
      const designPage = design.pages.find((page) => page.viewportId === viewport.id);
      const sitePage = websites.get(viewport.id)?.pages[0];
      if (!designPage || !sitePage)
        throw new PipelineError(
          'COMPARISON_FAILED',
          `No design frame or page for viewport ${viewport.id}.`,
        );
      return {
        viewport,
        designPage,
        sitePage,
        matches: matchElements(designPage, sitePage, {
          explicitMappings: audit.settings.explicitMappings,
          viewportWidth: viewport.width,
        }),
      };
    });
    const matchedCount = result.reduce((n, r) => n + r.matches.matches.length, 0);
    const designCount = result.reduce((n, r) => n + r.designPage.elements.length, 0);
    if (designCount > 1 && matchedCount <= result.length) {
      throw new PipelineError(
        'MATCHING_TOO_AMBIGUOUS',
        'No design elements could be matched to the website. Check that the URL and design frame show the same page.',
      );
    }
    return Promise.resolve({ result, metrics: { matched: matchedCount } });
  });

  return withStageRun(deps, audit, 'COMPARING', null, async () => {
    const comparisons: ViewportComparison[] = matched.map(
      ({ viewport, designPage, sitePage, matches }) =>
        compareViewport({
          viewport: { id: viewport.id, width: viewport.width, height: viewport.height },
          design: designPage,
          implementation: sitePage,
          matches,
          tolerances: { ...DEFAULT_TOLERANCES, ...audit.settings.tolerances },
        }),
    );
    const report = buildReport(audit.id, comparisons);
    const key = artifactKeys.report(audit.id);
    await putJson(deps.storage, key, report);
    await deps.repository.replaceIssues(audit.id, report.issues);
    await deps.repository.updateAudit(audit.id, {
      counts: report.counts,
      issueCount: report.issues.length,
      unresolvedCount: report.unresolved.length,
    });
    return {
      result: report,
      metrics: { issues: report.issues.length, unresolved: report.unresolved.length },
      artifactKeys: { report: key },
    };
  });
}
