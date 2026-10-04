import type { AuditStatus } from './generated/prisma/enums';
import type {
  ComparisonTolerances,
  ExplicitMapping,
  IssueCategory,
  IssueSeverity,
  ValidationIssue,
} from '@design-validator/design-spec';

/** Persistence-layer domain records, independent of the storage engine. */

export type { AuditStatus };

export type DesignSourceKind = 'figma' | 'adobe-xd';
export type StageRunStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'SKIPPED';

/** Repository used for source-code mapping (Phase 10). Public GitHub repositories only for now. */
export interface SourceRepositoryConfig {
  provider: 'github';
  owner: string;
  repo: string;
  ref: string;
}

export interface ProjectRecord {
  id: string;
  name: string;
  websiteUrl: string;
  sourceRepository: SourceRepositoryConfig | null;
  createdAt: string;
  updatedAt: string;
}

export interface DesignFrame {
  nodeId: string;
  name: string;
  width: number | null;
  height: number | null;
}

export interface DesignSourceRecord {
  id: string;
  projectId: string;
  kind: DesignSourceKind;
  name: string;
  /** Figma file URL, when applicable. */
  uri: string | null;
  /** Figma file key. */
  fileKey: string | null;
  revision: string | null;
  /** Selectable target frames/artboards. */
  frames: DesignFrame[];
  /** Object key of an uploaded Figma nodes export or XD manifest. */
  uploadObjectKey: string | null;
  createdAt: string;
}

export interface AuditViewportConfig {
  id: string;
  width: number;
  height: number;
  label?: string;
  /** Design frame representing this viewport. */
  designNodeId: string;
}

export interface AuditSettings {
  tolerances: Partial<ComparisonTolerances>;
  visualDiff: boolean;
  aiRecommendations: boolean;
  explicitMappings: ExplicitMapping[];
}

export interface AuditProgress {
  stage: AuditStatus;
  message: string;
  /** 0–1; never a time estimate. */
  progress: number;
}

export interface AuditRecord {
  id: string;
  projectId: string;
  designSourceId: string;
  websiteUrl: string;
  status: AuditStatus;
  viewports: AuditViewportConfig[];
  settings: AuditSettings;
  inputHash: string;
  progress: AuditProgress | null;
  failureCode: string | null;
  failureMessage: string | null;
  counts: Record<IssueCategory, number> | null;
  issueCount: number;
  unresolvedCount: number;
  warnings: string[];
  /** Audit this one re-validates (Phase 11). */
  parentAuditId: string | null;
  queuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StageRunRecord {
  idempotencyKey: string;
  auditId: string;
  stage: AuditStatus;
  viewportId: string | null;
  status: StageRunStatus;
  attempt: number;
  failureCode: string | null;
  failureMessage: string | null;
  metrics: Record<string, unknown> | null;
  artifactKeys: Record<string, string> | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface IssueQuery {
  viewportId?: string;
  category?: IssueCategory;
  severity?: IssueSeverity;
}

export interface RecommendationRecord {
  cacheKey: string;
  auditId: string;
  issueIds: string[];
  payload: unknown;
  model: string;
  promptVersion: string;
  createdAt: string;
}

export interface CreateProjectInput {
  name: string;
  websiteUrl: string;
}

export type CreateDesignSourceInput = Omit<DesignSourceRecord, 'id' | 'createdAt'>;

export type CreateAuditInput = Pick<
  AuditRecord,
  'projectId' | 'designSourceId' | 'websiteUrl' | 'viewports' | 'settings' | 'inputHash'
> & { parentAuditId?: string | null };

export type AuditPatch = Partial<
  Pick<
    AuditRecord,
    | 'status'
    | 'progress'
    | 'failureCode'
    | 'failureMessage'
    | 'counts'
    | 'issueCount'
    | 'unresolvedCount'
    | 'warnings'
    | 'startedAt'
    | 'completedAt'
  >
>;

export type StageRunInput = Pick<StageRunRecord, 'idempotencyKey' | 'auditId' | 'stage'> &
  Partial<Omit<StageRunRecord, 'idempotencyKey' | 'auditId' | 'stage'>>;

/**
 * Persistence port used by the pipeline and the web app. Implemented over
 * PostgreSQL (Prisma) and over object storage (JSON documents) for
 * deployments without a database.
 */
export interface AuditRepository {
  readonly kind: 'postgres' | 'documents';

  createProject(input: CreateProjectInput): Promise<ProjectRecord>;
  listProjects(): Promise<ProjectRecord[]>;
  getProject(id: string): Promise<ProjectRecord | null>;
  updateProject(
    id: string,
    patch: Partial<Pick<ProjectRecord, 'name' | 'websiteUrl' | 'sourceRepository'>>,
  ): Promise<ProjectRecord | null>;
  /** Deletes the project with its design sources, audits, issues and recommendations. */
  deleteProject(id: string): Promise<boolean>;

  createDesignSource(input: CreateDesignSourceInput): Promise<DesignSourceRecord>;
  listDesignSources(projectId: string): Promise<DesignSourceRecord[]>;
  getDesignSource(id: string): Promise<DesignSourceRecord | null>;
  /** Deletes the source and the audits that used it. */
  deleteDesignSource(id: string): Promise<boolean>;

  createAudit(input: CreateAuditInput): Promise<AuditRecord>;
  getAudit(id: string): Promise<AuditRecord | null>;
  /** Newest first. */
  listAudits(filter?: { projectId?: string; limit?: number }): Promise<AuditRecord[]>;
  updateAudit(id: string, patch: AuditPatch): Promise<AuditRecord | null>;
  deleteAudit(id: string): Promise<boolean>;
  /** Audits created before `date`, for retention cleanup. */
  listAuditsCreatedBefore(date: Date): Promise<AuditRecord[]>;

  /** Idempotent by `idempotencyKey`: retries update the same run. */
  upsertStageRun(input: StageRunInput): Promise<StageRunRecord>;
  listStageRuns(auditId: string): Promise<StageRunRecord[]>;

  /** Replaces all issues of an audit atomically (idempotent re-comparison). */
  replaceIssues(auditId: string, issues: ValidationIssue[]): Promise<void>;
  listIssues(auditId: string, query?: IssueQuery): Promise<ValidationIssue[]>;
  getIssue(auditId: string, issueId: string): Promise<ValidationIssue | null>;

  getRecommendation(cacheKey: string): Promise<RecommendationRecord | null>;
  saveRecommendation(
    record: Omit<RecommendationRecord, 'createdAt'>,
  ): Promise<RecommendationRecord>;
}
