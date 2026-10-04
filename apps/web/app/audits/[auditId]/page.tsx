import type { ValidationReport } from '@design-validator/design-spec';
import {
  artifactKeys,
  getJson,
  revalidationSummary,
  type VisualSummary,
} from '@design-validator/pipeline';
import { ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/20/solid';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AuditActions } from '@/components/audit/audit-actions';
import { AuditProcessing } from '@/components/audit/audit-processing';
import { AuditResults } from '@/components/audit/audit-results';
import { AuditSummary } from '@/components/audit/audit-summary';
import { RevalidationSummary } from '@/components/audit/revalidation-summary';
import { StatusBadge } from '@/components/audit/status-badge';
import { ViewportChips } from '@/components/audit/viewport-chips';
import { PageHeader } from '@/components/layout/page-header';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { STATUS_LABELS, displayUrl, formatDateTime } from '@/lib/labels';
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
    <PageHeader
      breadcrumbs={[
        { label: 'Projects', href: '/projects' },
        { label: project?.name ?? 'Project', href: `/projects/${audit.projectId}` },
      ]}
      title="Audit"
      description={
        <a
          href={audit.websiteUrl}
          target="_blank"
          rel="noreferrer"
          className="break-all font-medium text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950"
        >
          {displayUrl(audit.websiteUrl)}
        </a>
      }
      meta={
        <>
          <StatusBadge status={audit.status} />
          <span className="text-[13px] text-zinc-500">
            Design <span className="font-medium text-zinc-700">{source?.name ?? 'deleted'}</span>
          </span>
          <span aria-hidden className="text-zinc-300">
            ·
          </span>
          <ViewportChips viewports={audit.viewports} />
          <span aria-hidden className="text-zinc-300">
            ·
          </span>
          <span className="text-[13px] text-zinc-500">{formatDateTime(audit.createdAt)}</span>
        </>
      }
      actions={<AuditActions audit={audit} />}
    />
  );

  if (audit.status === 'FAILED' || audit.status === 'CANCELLED') {
    const failed = audit.status === 'FAILED';
    return (
      <>
        {header}
        <Card className="max-w-2xl animate-fade-up overflow-hidden">
          <div className="flex items-start gap-4 p-6">
            <span
              className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${failed ? 'bg-red-50 text-red-600' : 'bg-zinc-100 text-zinc-500'}`}
            >
              {failed ? (
                <XCircleIcon aria-hidden className="size-5" />
              ) : (
                <ExclamationTriangleIcon aria-hidden className="size-5" />
              )}
            </span>
            <div className="min-w-0 space-y-1.5">
              <h2 className="text-[17px] font-semibold tracking-tight text-zinc-950">
                {failed ? 'This audit could not finish' : 'This audit was cancelled'}
              </h2>
              {audit.failureMessage ? (
                <p className="text-sm text-zinc-600">{audit.failureMessage}</p>
              ) : null}
              {audit.failureCode ? (
                <p className="font-mono text-xs text-zinc-400">{audit.failureCode}</p>
              ) : null}
            </div>
          </div>
          {stageRuns.length > 0 ? (
            <ul className="divide-y divide-zinc-950/[0.05] border-t border-zinc-950/[0.06] text-sm">
              {stageRuns.map((run) => (
                <li
                  key={run.idempotencyKey}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-6 py-2.5"
                >
                  <span className="font-medium text-zinc-800">
                    {STATUS_LABELS[run.stage]}
                    {run.viewportId ? (
                      <span className="ml-1.5 font-mono text-xs text-zinc-400">
                        {run.viewportId}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={
                      run.status === 'FAILED'
                        ? 'text-red-700'
                        : 'text-zinc-500 first-letter:uppercase'
                    }
                  >
                    {run.failureMessage ?? run.status.toLowerCase()}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex gap-2 border-t border-zinc-950/[0.06] bg-zinc-50/70 px-6 py-4">
            <ButtonLink href={`/audits/new?projectId=${audit.projectId}`}>
              Start a new audit
            </ButtonLink>
            <ButtonLink href={`/projects/${audit.projectId}`} variant="secondary">
              Back to project
            </ButtonLink>
          </div>
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

  const [issues, report, visual, revalidation] = await Promise.all([
    deps.repository.listIssues(audit.id),
    getJson(deps.storage, artifactKeys.report(audit.id)) as Promise<ValidationReport | null>,
    getJson(deps.storage, artifactKeys.visual(audit.id)) as Promise<VisualSummary | null>,
    revalidationSummary(deps, audit.id),
  ]);

  return (
    <>
      {header}
      {revalidation ? (
        <RevalidationSummary parentId={revalidation.parent.id} diff={revalidation} />
      ) : null}
      <AuditSummary issues={issues} viewportCount={audit.viewports.length} />
      {audit.warnings.length > 0 ? (
        <details className="group mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-600/20">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-medium [&::-webkit-details-marker]:hidden">
            <ExclamationTriangleIcon aria-hidden className="size-4 text-amber-500" />
            {audit.warnings.length} measurement note{audit.warnings.length === 1 ? '' : 's'}
            <span className="font-normal text-amber-700 group-open:hidden">· show</span>
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-10 text-amber-800">
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
        aiAvailable={Boolean(deps.recommendationModel)}
        sourceAvailable={Boolean(project?.sourceRepository)}
      />
    </>
  );
}
