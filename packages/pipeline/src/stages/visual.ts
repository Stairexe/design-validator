import type { AuditRecord, DesignSourceRecord } from '@design-validator/database';
import { parseDesignSpec } from '@design-validator/design-spec';
import { FigmaClient } from '@design-validator/figma-parser';
import { PipelineError } from '@design-validator/jobs';
import { diffImages, renderDesignHtml } from '@design-validator/visual-diff';
import { renderHtmlToPng } from '@design-validator/web-inspector';

import { artifactKeys, getJson, putJson } from '../artifacts';
import type { PipelineDependencies } from '../deps';
import { withStageRun } from './stage-run';

export interface ViewportVisual {
  viewportId: string;
  /** Where the design image came from. Rendered images are approximations. */
  designImage: 'figma-export' | 'rendered';
  width: number;
  height: number;
  /** Design frame → viewport scale, for placing design-bounds highlights. */
  designScale: number;
  mismatchedPixels: number;
  mismatchRatio: number;
}

export interface VisualSummary {
  viewports: ViewportVisual[];
  warnings: string[];
}

async function figmaExport(
  deps: PipelineDependencies,
  source: DesignSourceRecord,
  nodeId: string,
  scale: number,
): Promise<Uint8Array | null> {
  if (
    source.kind !== 'figma' ||
    source.uploadObjectKey ||
    !source.fileKey ||
    !deps.figmaAccessToken
  )
    return null;
  const client = new FigmaClient({
    accessToken: deps.figmaAccessToken,
    ...(deps.fetch ? { fetch: deps.fetch } : {}),
  });
  const urls = await client.getImageUrls(
    source.fileKey,
    [nodeId],
    Math.min(4, Math.max(0.01, scale)),
  );
  const url = urls[nodeId];
  if (!url) return null;
  const response = await (deps.fetch ?? fetch)(url, { signal: AbortSignal.timeout(30_000) });
  return response.ok ? new Uint8Array(await response.arrayBuffer()) : null;
}

/** VISUAL_DIFF: design image (Figma export or rendering) vs website screenshot. Evidence only. */
export async function runVisualDiff(
  deps: PipelineDependencies,
  audit: AuditRecord,
  source: DesignSourceRecord,
): Promise<VisualSummary> {
  const design = parseDesignSpec(await getJson(deps.storage, artifactKeys.designSpec(audit.id)));
  const summary: VisualSummary = { viewports: [], warnings: [] };

  for (const viewport of audit.viewports) {
    const result = await withStageRun(deps, audit, 'VISUAL_DIFF', viewport.id, async () => {
      const page = design.pages.find((candidate) => candidate.viewportId === viewport.id);
      const website = await deps.storage.get(artifactKeys.websiteScreenshot(audit.id, viewport.id));
      if (!page || !website)
        throw new PipelineError(
          'VISUAL_DIFF_FAILED',
          `Missing inputs for viewport ${viewport.id}.`,
        );
      const frameWidth = page.width ?? viewport.width;
      const scale = viewport.width / frameWidth;

      let source_: ViewportVisual['designImage'] = 'figma-export';
      let image = await figmaExport(deps, source, viewport.designNodeId, scale).catch(
        (error: unknown) => {
          summary.warnings.push(
            `${viewport.id}: Figma image export failed (${error instanceof Error ? error.message : String(error)}); using a rendering.`,
          );
          return null;
        },
      );
      if (!image) {
        source_ = 'rendered';
        image = await renderHtmlToPng(
          deps.browserProvider,
          renderDesignHtml(page, { width: viewport.width, scale }),
          { width: viewport.width, height: viewport.height },
        );
      }
      const diff = diffImages(website.body, image);
      const designKey = artifactKeys.designImage(audit.id, viewport.id);
      const diffKey = artifactKeys.diffImage(audit.id, viewport.id);
      await deps.storage.put({ key: designKey, body: image, contentType: 'image/png' });
      await deps.storage.put({ key: diffKey, body: diff.diff, contentType: 'image/png' });
      const visual: ViewportVisual = {
        viewportId: viewport.id,
        designImage: source_,
        width: diff.width,
        height: diff.height,
        designScale: scale,
        mismatchedPixels: diff.mismatchedPixels,
        mismatchRatio: diff.mismatchRatio,
      };
      return {
        result: visual,
        metrics: { ...visual },
        artifactKeys: { design: designKey, diff: diffKey },
      };
    });
    summary.viewports.push(result);
  }
  await putJson(deps.storage, artifactKeys.visual(audit.id), summary);
  return summary;
}

/** Re-runs visual evidence for a completed audit. Returns null when inputs are missing. */
export async function regenerateVisualDiff(
  deps: PipelineDependencies,
  auditId: string,
): Promise<VisualSummary | null> {
  const audit = await deps.repository.getAudit(auditId);
  const source = audit ? await deps.repository.getDesignSource(audit.designSourceId) : null;
  if (!audit || !source || audit.status !== 'COMPLETED') return null;
  return runVisualDiff(deps, audit, source);
}
