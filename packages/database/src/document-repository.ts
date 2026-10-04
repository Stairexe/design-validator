import type { ValidationIssue } from '@design-validator/design-spec';
import type { ObjectStorage } from '@design-validator/storage';

import { newId, now } from './ids';
import type {
  AuditPatch,
  AuditRecord,
  AuditRepository,
  CreateAuditInput,
  CreateDesignSourceInput,
  CreateProjectInput,
  DesignSourceRecord,
  IssueQuery,
  ProjectRecord,
  RecommendationRecord,
  StageRunInput,
  StageRunRecord,
} from './records';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const KEYS = {
  project: (id: string) => `db/projects/${id}.json`,
  source: (id: string) => `db/design-sources/${id}.json`,
  audit: (id: string) => `db/audits/${id}.json`,
  issues: (auditId: string) => `db/audit-data/${auditId}/issues.json`,
  stage: (auditId: string, key: string) => `db/audit-data/${auditId}/stages/${key}.json`,
  recommendation: (cacheKey: string) => `db/recommendations/${cacheKey}.json`,
};

/**
 * Stores records as JSON documents in object storage. Intended for small
 * single-tenant deployments without PostgreSQL (e.g. Vercel + Blob). Each
 * audit is written by one pipeline at a time, so read-modify-write is safe.
 */
export class DocumentAuditRepository implements AuditRepository {
  readonly kind = 'documents' as const;
  readonly #storage: ObjectStorage;

  constructor(storage: ObjectStorage) {
    this.#storage = storage;
  }

  async #read<T>(key: string): Promise<T | null> {
    const stored = await this.#storage.get(key);
    return stored ? (JSON.parse(decoder.decode(stored.body)) as T) : null;
  }

  async #write(key: string, value: unknown): Promise<void> {
    await this.#storage.put({
      key,
      body: encoder.encode(JSON.stringify(value)),
      contentType: 'application/json',
    });
  }

  async #readAll<T>(prefix: string): Promise<T[]> {
    const keys = (await this.#storage.list(prefix)).filter((key) => key.endsWith('.json'));
    const values = await Promise.all(keys.map((key) => this.#read<T>(key)));
    return values.filter((value): value is Awaited<T> => value !== null);
  }

  async createProject(input: CreateProjectInput): Promise<ProjectRecord> {
    const timestamp = now();
    const project: ProjectRecord = {
      id: newId('prj'),
      name: input.name,
      websiteUrl: input.websiteUrl,
      sourceRepository: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.#write(KEYS.project(project.id), project);
    return project;
  }

  async listProjects(): Promise<ProjectRecord[]> {
    return (await this.#readAll<ProjectRecord>('db/projects/')).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  getProject(id: string): Promise<ProjectRecord | null> {
    return this.#read<ProjectRecord>(KEYS.project(id));
  }

  async updateProject(
    id: string,
    patch: Partial<Pick<ProjectRecord, 'name' | 'websiteUrl' | 'sourceRepository'>>,
  ): Promise<ProjectRecord | null> {
    const project = await this.getProject(id);
    if (!project) return null;
    const updated = { ...project, ...patch, updatedAt: now() };
    await this.#write(KEYS.project(id), updated);
    return updated;
  }

  async deleteProject(id: string): Promise<boolean> {
    const project = await this.getProject(id);
    if (!project) return false;
    for (const source of await this.listDesignSources(id)) await this.deleteDesignSource(source.id);
    for (const audit of await this.listAudits({ projectId: id })) await this.deleteAudit(audit.id);
    await this.#storage.delete(KEYS.project(id));
    return true;
  }

  async createDesignSource(input: CreateDesignSourceInput): Promise<DesignSourceRecord> {
    const source: DesignSourceRecord = { ...input, id: newId('src'), createdAt: now() };
    await this.#write(KEYS.source(source.id), source);
    return source;
  }

  async listDesignSources(projectId: string): Promise<DesignSourceRecord[]> {
    return (await this.#readAll<DesignSourceRecord>('db/design-sources/'))
      .filter((source) => source.projectId === projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getDesignSource(id: string): Promise<DesignSourceRecord | null> {
    return this.#read<DesignSourceRecord>(KEYS.source(id));
  }

  async deleteDesignSource(id: string): Promise<boolean> {
    const source = await this.getDesignSource(id);
    if (!source) return false;
    for (const audit of await this.listAudits({ projectId: source.projectId })) {
      if (audit.designSourceId === id) await this.deleteAudit(audit.id);
    }
    await this.#storage.delete(KEYS.source(id));
    return true;
  }

  async createAudit(input: CreateAuditInput): Promise<AuditRecord> {
    const timestamp = now();
    const audit: AuditRecord = {
      ...input,
      id: newId('aud'),
      status: 'QUEUED',
      progress: { stage: 'QUEUED', message: 'Queued', progress: 0 },
      failureCode: null,
      failureMessage: null,
      counts: null,
      issueCount: 0,
      unresolvedCount: 0,
      warnings: [],
      parentAuditId: input.parentAuditId ?? null,
      queuedAt: timestamp,
      startedAt: null,
      completedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.#write(KEYS.audit(audit.id), audit);
    return audit;
  }

  getAudit(id: string): Promise<AuditRecord | null> {
    return this.#read<AuditRecord>(KEYS.audit(id));
  }

  async listAudits(filter: { projectId?: string; limit?: number } = {}): Promise<AuditRecord[]> {
    const audits = (await this.#readAll<AuditRecord>('db/audits/'))
      .filter((audit) => !filter.projectId || audit.projectId === filter.projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
    return filter.limit ? audits.slice(0, filter.limit) : audits;
  }

  async updateAudit(id: string, patch: AuditPatch): Promise<AuditRecord | null> {
    const audit = await this.getAudit(id);
    if (!audit) return null;
    const updated = { ...audit, ...patch, updatedAt: now() };
    await this.#write(KEYS.audit(id), updated);
    return updated;
  }

  async deleteAudit(id: string): Promise<boolean> {
    const audit = await this.getAudit(id);
    if (!audit) return false;
    for (const key of await this.#storage.list(`db/audit-data/${id}/`))
      await this.#storage.delete(key);
    await this.#storage.delete(KEYS.audit(id));
    return true;
  }

  async listAuditsCreatedBefore(date: Date): Promise<AuditRecord[]> {
    const cutoff = date.toISOString();
    return (await this.listAudits()).filter((audit) => audit.createdAt < cutoff);
  }

  async upsertStageRun(input: StageRunInput): Promise<StageRunRecord> {
    const key = KEYS.stage(input.auditId, input.idempotencyKey);
    const existing = await this.#read<StageRunRecord>(key);
    const run: StageRunRecord = {
      viewportId: null,
      status: 'PENDING',
      attempt: 1,
      failureCode: null,
      failureMessage: null,
      metrics: null,
      artifactKeys: null,
      startedAt: null,
      finishedAt: null,
      ...existing,
      ...input,
    };
    await this.#write(key, run);
    return run;
  }

  async listStageRuns(auditId: string): Promise<StageRunRecord[]> {
    return (await this.#readAll<StageRunRecord>(`db/audit-data/${auditId}/stages/`)).sort((a, b) =>
      (a.startedAt ?? '').localeCompare(b.startedAt ?? ''),
    );
  }

  async replaceIssues(auditId: string, issues: ValidationIssue[]): Promise<void> {
    await this.#write(KEYS.issues(auditId), issues);
  }

  async listIssues(auditId: string, query: IssueQuery = {}): Promise<ValidationIssue[]> {
    const issues = (await this.#read<ValidationIssue[]>(KEYS.issues(auditId))) ?? [];
    return issues.filter(
      (issue) =>
        (!query.viewportId || issue.viewportId === query.viewportId) &&
        (!query.category || issue.category === query.category) &&
        (!query.severity || issue.severity === query.severity),
    );
  }

  async getIssue(auditId: string, issueId: string): Promise<ValidationIssue | null> {
    return (await this.listIssues(auditId)).find((issue) => issue.id === issueId) ?? null;
  }

  getRecommendation(cacheKey: string): Promise<RecommendationRecord | null> {
    return this.#read<RecommendationRecord>(KEYS.recommendation(cacheKey));
  }

  async saveRecommendation(
    record: Omit<RecommendationRecord, 'createdAt'>,
  ): Promise<RecommendationRecord> {
    const saved = { ...record, createdAt: now() };
    await this.#write(KEYS.recommendation(record.cacheKey), saved);
    return saved;
  }
}
