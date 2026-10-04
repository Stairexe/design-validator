import type { ValidationReport } from '@design-validator/design-spec';
import { artifactKeys, getJson, type VisualSummary } from '@design-validator/pipeline';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AuditProcessing } from '@/components/audit/audit-processing';
import { AuditResults } from '@/components/audit/audit-results';
import { AuditActions } from '@/components/audit/audit-actions';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { STATUS_LABELS, formatDateTime, statusTone } from '@/lib/labels';
import { getDeps } from '@/lib/server/runtime';

export const metadata: Metadata = { title: 'Audit' };
export const dynamic = 'force-dynamic';

export default async function AuditPage({ params }: { params: Promise<{ auditId: string }> }) {
  const { auditId } = await params;
  const deps = getDeps();
  const audit = await deps.repository.getAudit(auditId);
  if (!audit) notFound();
  const [project, source, stageRuns] = await Promise.all([
    deps.repository.getProject(audit.projectId),
    deps.repository.getDesignSource(audit.designSourceId),
    deps.repository.listStageRuns(audit.id),
  ]);

  const header = (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-sm text-zinc-500">
          <Link
            href={`/projects/${audit.projectId}`}
            className="underline-offset-2 hover:underline"
          >
            {project?.name ?? 'Project'}
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Audit</h1>
        <p className="mt-1 break-all font-mono text-xs text-zinc-600">{audit.websiteUrl}</p>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
          <Badge tone={statusTone(audit.status)}>{STATUS_LABELS[audit.status]}</Badge>
          <span>Design: {source?.name ?? 'deleted source'}</span>
          <span>Viewports: {audit.viewports.map((v) => `${v.width}×${v.height}`).join(', ')}</span>
          <span>{formatDateTime(audit.createdAt)}</span>
        </p>
      </div>
      <AuditActions audit={audit} />
    </div>
  );

  if (audit.status === 'FAILED' || audit.status === 'CANCELLED') {
    return (
      <>
        {header}
        <Card className="max-w-2xl">
          <CardHeader
            title={audit.status === 'FAILED' ? 'Validation failed' : 'Validation cancelled'}
          />
          <CardBody className="space-y-3 text-sm">
            {audit.failureCode ? (
              <p>
                <span className="font-mono text-xs">{audit.failureCode}</span>:{' '}
                {audit.failureMessage}
              </p>
            ) : null}
            <ul className="space-y-1">
              {stageRuns.map((run) => (
                <li key={run.idempotencyKey}>
                  {STATUS_LABELS[run.stage]} {run.viewportId ? `(${run.viewportId})` : ''}:{' '}
                  {run.status.toLowerCase()}
                  {run.failureMessage ? ` — ${run.failureMessage}` : ''}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </>
    );
  }

  if (audit.status !== 'COMPLETED') {
    return (
      <>
        {header}
        <AuditProcessing initial={{ audit, stageRuns }} />
      </>
    );
  }

  const [issues, report, visual] = await Promise.all([
    deps.repository.listIssues(audit.id),
    getJson(deps.storage, artifactKeys.report(audit.id)) as Promise<ValidationReport | null>,
    getJson(deps.storage, artifactKeys.visual(audit.id)) as Promise<VisualSummary | null>,
  ]);

  return (
    <>
      {header}
      {audit.warnings.length > 0 ? (
        <details className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <summary className="cursor-pointer">
            {audit.warnings.length} measurement warning{audit.warnings.length === 1 ? '' : 's'}
          </summary>
          <ul className="mt-2 list-disc pl-5">
            {audit.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </details>
      ) : null}
      <AuditResults
        audit={audit}
        issues={issues}
        report={{
          groups: report?.groups ?? [],
          unresolved: report?.unresolved ?? [],
          viewports: report?.viewports ?? [],
        }}
        visual={visual}
        aiAvailable={Boolean(process.env['ANTHROPIC_API_KEY'])}
        sourceAvailable={Boolean(project?.sourceRepository)}
      />
    </>
  );
}
