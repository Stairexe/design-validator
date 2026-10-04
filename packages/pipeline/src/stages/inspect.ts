import type { AuditRecord } from '@design-validator/database';
import { inspectWebsite } from '@design-validator/web-inspector';

import { artifactKeys, putJson } from '../artifacts';
import { sampleDocumentOverrides } from '../sample';
import type { PipelineDependencies } from '../deps';
import { withStageRun } from './stage-run';

/** Inspects the website at every viewport; stores each Website DesignSpec and screenshot. */
export async function runWebsiteInspection(
  deps: PipelineDependencies,
  audit: AuditRecord,
  onViewport?: (index: number) => Promise<void>,
): Promise<string[]> {
  const warnings: string[] = [];
  const documentOverrides = sampleDocumentOverrides(audit.websiteUrl, deps.selfOrigins);
  for (const [index, config] of audit.viewports.entries()) {
    const viewport = {
      id: config.id,
      width: config.width,
      height: config.height,
      ...(config.label ? { label: config.label } : {}),
    };
    await onViewport?.(index);
    await withStageRun(deps, audit, 'INSPECTING_WEBSITE', viewport.id, async () => {
      const [inspection] = await inspectWebsite({
        url: audit.websiteUrl,
        viewports: [viewport],
        browserProvider: deps.browserProvider,
        options: {
          allowPrivateHosts: deps.allowPrivateHosts,
          ...(deps.inspectionOriginHeaders ? { originHeaders: deps.inspectionOriginHeaders } : {}),
          ...(documentOverrides ? { documentOverrides } : {}),
        },
      });
      if (!inspection) throw new Error('Inspection returned no result.');
      const specKey = artifactKeys.websiteSpec(audit.id, viewport.id);
      const screenshotKey = artifactKeys.websiteScreenshot(audit.id, viewport.id);
      await putJson(deps.storage, specKey, inspection.spec);
      await deps.storage.put({
        key: screenshotKey,
        body: inspection.screenshot,
        contentType: 'image/png',
      });
      warnings.push(...inspection.warnings.map((warning) => `${viewport.id}: ${warning}`));
      return {
        result: undefined,
        metrics: {
          elementCount: inspection.elementCount,
          httpStatus: inspection.httpStatus,
          stability: inspection.stability,
          finalUrl: inspection.finalUrl,
        },
        artifactKeys: { spec: specKey, screenshot: screenshotKey },
      };
    });
  }
  return warnings;
}
