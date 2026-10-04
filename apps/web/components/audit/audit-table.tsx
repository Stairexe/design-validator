import type { AuditRecord, ProjectRecord } from '@design-validator/database';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { STATUS_LABELS, differenceCount, formatDateTime, statusTone } from '@/lib/labels';

export function AuditTable({
  audits,
  projects,
}: {
  audits: AuditRecord[];
  projects?: Map<string, ProjectRecord>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-5 py-2 font-medium">Audit</th>
            <th className="px-5 py-2 font-medium">Status</th>
            <th className="px-5 py-2 font-medium">Viewports</th>
            <th className="px-5 py-2 font-medium">Result</th>
            <th className="px-5 py-2 font-medium">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {audits.map((audit) => (
            <tr key={audit.id} className="hover:bg-zinc-50">
              <td className="px-5 py-3">
                <Link
                  href={`/audits/${audit.id}`}
                  className="font-medium text-zinc-900 underline-offset-2 hover:underline"
                >
                  {projects?.get(audit.projectId)?.name ?? audit.websiteUrl}
                </Link>
                <div className="max-w-xs truncate text-xs text-zinc-500">{audit.websiteUrl}</div>
              </td>
              <td className="px-5 py-3">
                <Badge tone={statusTone(audit.status)}>{STATUS_LABELS[audit.status]}</Badge>
              </td>
              <td className="px-5 py-3 text-zinc-600">
                {audit.viewports.map((v) => `${v.width}×${v.height}`).join(', ')}
              </td>
              <td className="px-5 py-3 text-zinc-700">
                {audit.status === 'COMPLETED'
                  ? differenceCount(audit.issueCount)
                  : audit.status === 'FAILED'
                    ? audit.failureCode
                    : '—'}
              </td>
              <td className="px-5 py-3 whitespace-nowrap text-zinc-500">
                {formatDateTime(audit.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
