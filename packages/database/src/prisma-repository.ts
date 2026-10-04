import type { IssueCategory, ValidationIssue } from '@design-validator/design-spec';

import type { DatabaseClient } from './client';
import type { Prisma } from './generated/prisma/client';
import { newId } from './ids';
import type {
  AuditPatch,
  AuditProgress,
  AuditRecord,
  AuditRepository,
  AuditSettings,
  AuditViewportConfig,
  CreateAuditInput,
  CreateDesignSourceInput,
  CreateProjectInput,
  DesignFrame,
  DesignSourceRecord,
  IssueQuery,
  ProjectRecord,
  RecommendationRecord,
  SourceRepositoryConfig,
  StageRunInput,
  StageRunRecord,
} from './records';

type ProjectRow = Prisma.ProjectGetPayload<object>;
type SourceRow = Prisma.DesignSourceGetPayload<object>;
type AuditRow = Prisma.AuditGetPayload<object>;
type StageRow = Prisma.AuditStageRunGetPayload<object>;

const json = (value: unknown) => value as Prisma.InputJsonValue;
const iso = (date: Date | null) => (date ? date.toISOString() : null);

const toProject = (row: ProjectRow): ProjectRecord => ({
  id: row.id,
  name: row.name,
  websiteUrl: row.websiteUrl,
  sourceRepository: (row.sourceRepository as SourceRepositoryConfig | null) ?? null,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const toSource = (row: SourceRow): DesignSourceRecord => ({
  id: row.id,
  projectId: row.projectId,
  kind: row.type === 'FIGMA' ? 'figma' : 'adobe-xd',
  name: row.name,
  uri: row.uri,
  fileKey: row.externalId,
  revision: row.revision,
  frames: row.frames as unknown as DesignFrame[],
  uploadObjectKey: row.uploadObjectKey,
  createdAt: row.createdAt.toISOString(),
});

const toAudit = (row: AuditRow): AuditRecord => ({
  id: row.id,
  projectId: row.projectId,
  designSourceId: row.designSourceId,
  websiteUrl: row.websiteUrl,
  status: row.status,
  viewports: row.viewports as unknown as AuditViewportConfig[],
  settings: row.settings as unknown as AuditSettings,
  inputHash: row.inputHash,
  progress: (row.progress as unknown as AuditProgress | null) ?? null,
  failureCode: row.failureCode,
  failureMessage: row.failureMessage,
  counts: (row.counts as unknown as Record<IssueCategory, number> | null) ?? null,
  issueCount: row.issueCount,
  unresolvedCount: row.unresolvedCount,
  warnings: row.warnings as unknown as string[],
  parentAuditId: row.parentAuditId,
  queuedAt: row.queuedAt.toISOString(),
  startedAt: iso(row.startedAt),
  completedAt: iso(row.completedAt),
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const toStage = (row: StageRow): StageRunRecord => ({
  idempotencyKey: row.idempotencyKey,
  auditId: row.auditId,
  stage: row.stage,
  viewportId: row.viewportId,
  status: row.status,
  attempt: row.attempt,
  failureCode: row.failureCode,
  failureMessage: row.failureMessage,
  metrics: (row.metrics as Record<string, unknown> | null) ?? null,
  artifactKeys: (row.artifactKeys as Record<string, string> | null) ?? null,
  startedAt: iso(row.startedAt),
  finishedAt: iso(row.finishedAt),
});

const date = (value: string | null): Date | null => (value === null ? null : new Date(value));

/** PostgreSQL implementation of the persistence port. */
export class PrismaAuditRepository implements AuditRepository {
  readonly kind = 'postgres' as const;
  readonly #db: DatabaseClient;

  constructor(db: DatabaseClient) {
    this.#db = db;
  }

  async createProject(input: CreateProjectInput): Promise<ProjectRecord> {
    return toProject(
      await this.#db.project.create({
        data: { id: newId('prj'), name: input.name, websiteUrl: input.websiteUrl },
      }),
    );
  }

  async listProjects(): Promise<ProjectRecord[]> {
    return (await this.#db.project.findMany({ orderBy: { createdAt: 'desc' } })).map(toProject);
  }

  async getProject(id: string): Promise<ProjectRecord | null> {
    const row = await this.#db.project.findUnique({ where: { id } });
    return row ? toProject(row) : null;
  }

  async updateProject(
    id: string,
    patch: Partial<Pick<ProjectRecord, 'name' | 'websiteUrl' | 'sourceRepository'>>,
  ): Promise<ProjectRecord | null> {
    const exists = await this.#db.project.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return null;
    const row = await this.#db.project.update({
      where: { id },
      data: {
        ...(patch.name === undefined ? {} : { name: patch.name }),
        ...(patch.websiteUrl === undefined ? {} : { websiteUrl: patch.websiteUrl }),
        ...(patch.sourceRepository === undefined
          ? {}
          : {
              sourceRepository:
                patch.sourceRepository === null
                  ? (null as unknown as Prisma.InputJsonValue)
                  : json(patch.sourceRepository),
            }),
      },
    });
    return toProject(row);
  }

  async deleteProject(id: string): Promise<boolean> {
    return (await this.#db.project.deleteMany({ where: { id } })).count > 0;
  }

  async createDesignSource(input: CreateDesignSourceInput): Promise<DesignSourceRecord> {
    const row = await this.#db.designSource.create({
      data: {
        id: newId('src'),
        projectId: input.projectId,
        type: input.kind === 'figma' ? 'FIGMA' : 'ADOBE_XD',
        name: input.name,
        uri: input.uri,
        externalId: input.fileKey,
        revision: input.revision,
        frames: json(input.frames),
        uploadObjectKey: input.uploadObjectKey,
      },
    });
    return toSource(row);
  }

  async listDesignSources(projectId: string): Promise<DesignSourceRecord[]> {
    return (
      await this.#db.designSource.findMany({ where: { projectId }, orderBy: { createdAt: 'desc' } })
    ).map(toSource);
  }

  async getDesignSource(id: string): Promise<DesignSourceRecord | null> {
    const row = await this.#db.designSource.findUnique({ where: { id } });
    return row ? toSource(row) : null;
  }

  async deleteDesignSource(id: string): Promise<boolean> {
    return (await this.#db.designSource.deleteMany({ where: { id } })).count > 0;
  }

  async createAudit(input: CreateAuditInput): Promise<AuditRecord> {
    const row = await this.#db.audit.create({
      data: {
        id: newId('aud'),
        projectId: input.projectId,
        designSourceId: input.designSourceId,
        websiteUrl: input.websiteUrl,
        viewports: json(input.viewports),
        settings: json(input.settings),
        inputHash: input.inputHash,
        parentAuditId: input.parentAuditId ?? null,
        progress: json({ stage: 'QUEUED', message: 'Queued', progress: 0 }),
      },
    });
    return toAudit(row);
  }

  async getAudit(id: string): Promise<AuditRecord | null> {
    const row = await this.#db.audit.findUnique({ where: { id } });
    return row ? toAudit(row) : null;
  }

  async listAudits(filter: { projectId?: string; limit?: number } = {}): Promise<AuditRecord[]> {
    const rows = await this.#db.audit.findMany({
      ...(filter.projectId ? { where: { projectId: filter.projectId } } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...(filter.limit ? { take: filter.limit } : {}),
    });
    return rows.map(toAudit);
  }

  async updateAudit(id: string, patch: AuditPatch): Promise<AuditRecord | null> {
    const exists = await this.#db.audit.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return null;
    const data: Prisma.AuditUpdateInput = {};
    if (patch.status !== undefined) data.status = patch.status;
    if (patch.progress !== undefined)
      data.progress =
        patch.progress === null ? (null as unknown as Prisma.InputJsonValue) : json(patch.progress);
    if (patch.failureCode !== undefined) data.failureCode = patch.failureCode;
    if (patch.failureMessage !== undefined) data.failureMessage = patch.failureMessage;
    if (patch.counts !== undefined)
      data.counts =
        patch.counts === null ? (null as unknown as Prisma.InputJsonValue) : json(patch.counts);
    if (patch.issueCount !== undefined) data.issueCount = patch.issueCount;
    if (patch.unresolvedCount !== undefined) data.unresolvedCount = patch.unresolvedCount;
    if (patch.warnings !== undefined) data.warnings = json(patch.warnings);
    if (patch.startedAt !== undefined) data.startedAt = date(patch.startedAt);
    if (patch.completedAt !== undefined) data.completedAt = date(patch.completedAt);
    return toAudit(await this.#db.audit.update({ where: { id }, data }));
  }

  async deleteAudit(id: string): Promise<boolean> {
    return (await this.#db.audit.deleteMany({ where: { id } })).count > 0;
  }

  async listAuditsCreatedBefore(cutoff: Date): Promise<AuditRecord[]> {
    return (
      await this.#db.audit.findMany({
        where: { createdAt: { lt: cutoff } },
        orderBy: { createdAt: 'asc' },
      })
    ).map(toAudit);
  }

  async upsertStageRun(input: StageRunInput): Promise<StageRunRecord> {
    const fields = {
      ...(input.viewportId === undefined ? {} : { viewportId: input.viewportId }),
      ...(input.status === undefined ? {} : { status: input.status }),
      ...(input.attempt === undefined ? {} : { attempt: input.attempt }),
      ...(input.failureCode === undefined ? {} : { failureCode: input.failureCode }),
      ...(input.failureMessage === undefined ? {} : { failureMessage: input.failureMessage }),
      ...(input.metrics === undefined || input.metrics === null
        ? {}
        : { metrics: json(input.metrics) }),
      ...(input.artifactKeys === undefined || input.artifactKeys === null
        ? {}
        : { artifactKeys: json(input.artifactKeys) }),
      ...(input.startedAt === undefined ? {} : { startedAt: date(input.startedAt) }),
      ...(input.finishedAt === undefined ? {} : { finishedAt: date(input.finishedAt) }),
    };
    const row = await this.#db.auditStageRun.upsert({
      where: { idempotencyKey: input.idempotencyKey },
      create: {
        idempotencyKey: input.idempotencyKey,
        auditId: input.auditId,
        stage: input.stage,
        ...fields,
      },
      update: fields,
    });
    return toStage(row);
  }

  async listStageRuns(auditId: string): Promise<StageRunRecord[]> {
    return (
      await this.#db.auditStageRun.findMany({ where: { auditId }, orderBy: { createdAt: 'asc' } })
    ).map(toStage);
  }

  async replaceIssues(auditId: string, issues: ValidationIssue[]): Promise<void> {
    await this.#db.$transaction([
      this.#db.issue.deleteMany({ where: { auditId } }),
      this.#db.issue.createMany({
        data: issues.map((issue, position) => ({
          auditId,
          issueId: issue.id,
          viewportId: issue.viewportId,
          category: issue.category,
          severity: issue.severity,
          status: issue.status,
          property: issue.property,
          elementName: issue.element.name,
          designId: issue.element.designId ?? null,
          implementationId: issue.element.implementationId ?? null,
          position,
          data: json(issue),
        })),
      }),
    ]);
  }

  async listIssues(auditId: string, query: IssueQuery = {}): Promise<ValidationIssue[]> {
    const rows = await this.#db.issue.findMany({
      where: {
        auditId,
        ...(query.viewportId ? { viewportId: query.viewportId } : {}),
        ...(query.category ? { category: query.category } : {}),
        ...(query.severity ? { severity: query.severity } : {}),
      },
      orderBy: { position: 'asc' },
    });
    return rows.map((row) => row.data as unknown as ValidationIssue);
  }

  async getIssue(auditId: string, issueId: string): Promise<ValidationIssue | null> {
    const row = await this.#db.issue.findUnique({
      where: { auditId_issueId: { auditId, issueId } },
    });
    return row ? (row.data as unknown as ValidationIssue) : null;
  }

  async getRecommendation(cacheKey: string): Promise<RecommendationRecord | null> {
    const row = await this.#db.recommendation.findUnique({ where: { cacheKey } });
    return row
      ? {
          cacheKey: row.cacheKey,
          auditId: row.auditId,
          issueIds: row.issueIds as string[],
          payload: row.payload,
          model: row.model,
          promptVersion: row.promptVersion,
          createdAt: row.createdAt.toISOString(),
        }
      : null;
  }

  async saveRecommendation(
    record: Omit<RecommendationRecord, 'createdAt'>,
  ): Promise<RecommendationRecord> {
    const data = {
      auditId: record.auditId,
      issueIds: json(record.issueIds),
      payload: json(record.payload),
      model: record.model,
      promptVersion: record.promptVersion,
    };
    const row = await this.#db.recommendation.upsert({
      where: { cacheKey: record.cacheKey },
      create: { cacheKey: record.cacheKey, ...data },
      update: data,
    });
    return { ...record, createdAt: row.createdAt.toISOString() };
  }
}
