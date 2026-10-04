import type { AuditRecord, ProjectRecord } from '@design-validator/database';
import { CheckCircleIcon, ChevronRightIcon } from '@heroicons/react/16/solid';
import Link from 'next/link';

import { differenceCount, displayUrl, formatDateTime, formatRelative } from '@/lib/labels';

import { StatusBadge } from './status-badge';
import { ViewportChips } from './viewport-chips';

function Result({ audit }: { audit: AuditRecord }) {
  if (audit.status === 'COMPLETED') {
    return audit.issueCount === 0 ? (
      <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
        <CheckCircleIcon aria-hidden className="size-4" />
        Matches design
      </span>
    ) : (
      <span className="whitespace-nowrap font-medium text-zinc-900 tabular-nums">
        {differenceCount(audit.issueCount)}
      </span>
    );
  }
  if (audit.status === 'FAILED') {
    return (
      <span className="line-clamp-1 text-red-700" title={audit.failureMessage ?? undefined}>
        {audit.failureMessage ?? audit.failureCode}
      </span>
    );
  }
  if (audit.status === 'CANCELLED') return <span className="text-zinc-400">—</span>;
  return <span className="text-zinc-500">{audit.progress?.message ?? 'Waiting to start'}</span>;
}

export function AuditTable({
  audits,
  projects,
}: {
  audits: AuditRecord[];
  projects?: Map<string, ProjectRecord>;
}) {
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-950/[0.06] text-xs text-zinc-500">
            <th scope="col" className="py-2.5 pl-5 pr-3 font-medium">
              Audit
            </th>
            <th scope="col" className="px-3 py-2.5 font-medium">
              Status
            </th>
            <th scope="col" className="hidden px-3 py-2.5 font-medium md:table-cell">
              Viewports
            </th>
            <th scope="col" className="px-3 py-2.5 font-medium">
              Result
            </th>
            <th scope="col" className="hidden px-3 py-2.5 font-medium sm:table-cell">
              Started
            </th>
            <th scope="col" className="w-8 pr-4">
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-950/[0.05]">
          {audits.map((audit) => (
            <tr key={audit.id} className="group relative transition-colors hover:bg-zinc-50/80">
              <td className="max-w-[18rem] py-3 pl-5 pr-3">
                <Link
                  href={`/audits/${audit.id}`}
                  className="font-medium text-zinc-950 after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-brand-500"
                >
                  {projects
                    ? (projects.get(audit.projectId)?.name ?? displayUrl(audit.websiteUrl))
                    : formatDateTime(audit.createdAt)}
                </Link>
                <div className="truncate text-xs text-zinc-500">{displayUrl(audit.websiteUrl)}</div>
              </td>
              <td className="px-3 py-3">
                <StatusBadge status={audit.status} />
              </td>
              <td className="hidden px-3 py-3 md:table-cell">
                <ViewportChips viewports={audit.viewports} />
              </td>
              <td className="max-w-[16rem] px-3 py-3">
                <Result audit={audit} />
              </td>
              <td
                className="hidden whitespace-nowrap px-3 py-3 text-zinc-500 sm:table-cell"
                title={formatDateTime(audit.createdAt)}
              >
                {formatRelative(audit.createdAt)}
              </td>
              <td className="pr-4">
                <ChevronRightIcon
                  aria-hidden
                  className="size-4 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-500"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
