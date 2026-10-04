import type { AuditRecord, DesignSourceRecord } from '@design-validator/database';
import { parseDesignSpec, type DesignSpec } from '@design-validator/design-spec';
import {
  FigmaClient,
  figmaToDesignSpec,
  importFigmaDesign,
  type FigmaNodesResponse,
} from '@design-validator/figma-parser';
import { PipelineError } from '@design-validator/jobs';
import { validateXdManifest, xdManifestToDesignSpec } from '@design-validator/xd-parser';

import { artifactKeys, getJson, putJson } from '../artifacts';
import type { PipelineDependencies } from '../deps';
import { withStageRun } from './stage-run';

const viewportOf = (config: AuditRecord['viewports'][number]) => ({
  id: config.id,
  width: config.width,
  height: config.height,
  ...(config.label ? { label: config.label } : {}),
});

/** Loads the design source and normalizes the audit's target frames into one DesignSpec (a page per viewport). */
export async function loadDesignSpec(
  deps: PipelineDependencies,
  audit: AuditRecord,
  source: DesignSourceRecord,
): Promise<DesignSpec> {
  if (source.kind === 'adobe-xd') {
    if (!source.uploadObjectKey)
      throw new PipelineError(
        'XD_MANIFEST_INVALID',
        'The Adobe XD design source has no uploaded manifest.',
      );
    const manifest = validateXdManifest(await getJson(deps.storage, source.uploadObjectKey));
    return xdManifestToDesignSpec(
      manifest,
      audit.viewports.map((viewport) => ({
        artboardGuid: viewport.designNodeId,
        viewport: viewportOf(viewport),
      })),
    );
  }

  const targets = audit.viewports.map((viewport) => ({
    nodeId: viewport.designNodeId,
    viewport: viewportOf(viewport),
  }));
  if (source.uploadObjectKey) {
    const response = (await getJson(
      deps.storage,
      source.uploadObjectKey,
    )) as FigmaNodesResponse | null;
    if (!response)
      throw new PipelineError('DESIGN_SOURCE_INVALID', 'The uploaded Figma export is missing.');
    return figmaToDesignSpec({ fileKey: source.fileKey ?? 'upload', response, targets });
  }
  if (!source.fileKey)
    throw new PipelineError('DESIGN_SOURCE_INVALID', 'The Figma design source has no file key.');
  if (!deps.figmaAccessToken) {
    throw new PipelineError(
      'FIGMA_AUTH_FAILED',
      'No Figma access token is configured on the server (FIGMA_ACCESS_TOKEN).',
    );
  }
  const client = new FigmaClient({
    accessToken: deps.figmaAccessToken,
    ...(deps.fetch ? { fetch: deps.fetch } : {}),
  });
  return importFigmaDesign(client, source.fileKey, targets);
}

/** IMPORTING_DESIGN + NORMALIZING: produce and store the design DesignSpec. */
export async function runDesignImport(
  deps: PipelineDependencies,
  audit: AuditRecord,
  source: DesignSourceRecord,
): Promise<DesignSpec> {
  const spec = await withStageRun(deps, audit, 'IMPORTING_DESIGN', null, async () => {
    const imported = await loadDesignSpec(deps, audit, source);
    return {
      result: imported,
      metrics: {
        pages: imported.pages.length,
        elements: imported.pages.reduce((n, p) => n + p.elements.length, 0),
      },
    };
  });
  return withStageRun(deps, audit, 'NORMALIZING', null, async () => {
    // Adapters already normalize; this stage enforces the shared schema before comparison.
    const validated = parseDesignSpec(spec);
    const key = artifactKeys.designSpec(audit.id);
    await putJson(deps.storage, key, validated);
    return { result: validated, artifactKeys: { spec: key } };
  });
}
