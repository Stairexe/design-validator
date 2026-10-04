import type { AuditRecord, AuditSettings, AuditViewportConfig } from '@design-validator/database';
import { PipelineError, isTerminalStatus } from '@design-validator/jobs';
import { validateTargetUrl } from '@design-validator/web-inspector';

import { deleteAuditArtifacts } from './artifacts';
import type { PipelineDependencies } from './deps';
import { toPipelineError } from './failures';
import { auditInputHash } from './input-hash';

export interface CreateAuditRequest {
  projectId: string;
  designSourceId: string;
  /** Defaults to the project's website URL. */
  websiteUrl?: string | undefined;
  viewports: AuditViewportConfig[];
  settings?: Partial<AuditSettings> | undefined;
  parentAuditId?: string | undefined;
}

export const DEFAULT_SETTINGS: AuditSettings = {
  tolerances: {},
  visualDiff: true,
  aiRecommendations: false,
  explicitMappings: [],
};

/**
 * Validates and records a new audit (status QUEUED). Execution is started
 * separately (`runAudit` inline or `enqueueAudit` for workers).
 */
export async function createAudit(
  deps: PipelineDependencies,
  request: CreateAuditRequest,
): Promise<AuditRecord> {
  const project = await deps.repository.getProject(request.projectId);
  if (!project) throw new PipelineError('DESIGN_SOURCE_INVALID', 'Project not found.');
  const source = await deps.repository.getDesignSource(request.designSourceId);
  if (!source || source.projectId !== project.id)
    throw new PipelineError('DESIGN_SOURCE_INVALID', 'Design source not found in this project.');
  if (request.viewports.length === 0)
    throw new PipelineError('DESIGN_SOURCE_INVALID', 'Select at least one viewport.');
  const frameIds = new Set(source.frames.map((frame) => frame.nodeId));
  for (const viewport of request.viewports) {
    if (!frameIds.has(viewport.designNodeId)) {
      throw new PipelineError(
        'DESIGN_SOURCE_INVALID',
        `Viewport ${viewport.id} targets an unknown design frame (${viewport.designNodeId}).`,
      );
    }
  }
  if (new Set(request.viewports.map((v) => v.id)).size !== request.viewports.length) {
    throw new PipelineError('DESIGN_SOURCE_INVALID', 'Viewport IDs must be unique.');
  }

  const websiteUrl = request.websiteUrl ?? project.websiteUrl;
  try {
    // Validate before queuing so obviously unsafe targets never reach a browser.
    await validateTargetUrl(websiteUrl, { allowPrivateHosts: deps.allowPrivateHosts });
  } catch (error) {
    throw toPipelineError(error);
  }

  const settings: AuditSettings = { ...DEFAULT_SETTINGS, ...request.settings };
  return deps.repository.createAudit({
    projectId: project.id,
    designSourceId: source.id,
    websiteUrl,
    viewports: request.viewports,
    settings,
    inputHash: auditInputHash({ websiteUrl, viewports: request.viewports, settings, source }),
    parentAuditId: request.parentAuditId ?? null,
  });
}

/** Marks a running audit cancelled; the pipeline stops before its next stage. */
export async function cancelAudit(
  deps: PipelineDependencies,
  auditId: string,
): Promise<AuditRecord | null> {
  const audit = await deps.repository.getAudit(auditId);
  if (!audit) return null;
  if (isTerminalStatus(audit.status)) return audit;
  return deps.repository.updateAudit(auditId, {
    status: 'CANCELLED',
    completedAt: new Date().toISOString(),
    progress: { stage: 'CANCELLED', message: 'Cancelled', progress: audit.progress?.progress ?? 0 },
  });
}

/** Deletes an audit with its issues, recommendations and stored artifacts. */
export async function deleteAudit(deps: PipelineDependencies, auditId: string): Promise<boolean> {
  await deleteAuditArtifacts(deps.storage, auditId);
  return deps.repository.deleteAudit(auditId);
}

/** Deletes a project, its audits and all of their artifacts. */
export async function deleteProject(
  deps: PipelineDependencies,
  projectId: string,
): Promise<boolean> {
  for (const audit of await deps.repository.listAudits({ projectId }))
    await deleteAuditArtifacts(deps.storage, audit.id);
  return deps.repository.deleteProject(projectId);
}
