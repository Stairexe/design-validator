'use client';

import type { AuditRecord } from '@design-validator/database';
import { ArrowDownTrayIcon, TrashIcon } from '@heroicons/react/16/solid';
import { useRouter } from 'next/navigation';

import { buttonClass } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { apiRequest } from '@/lib/api-client';

import { RevalidateButton } from './revalidate-button';

export function AuditActions({ audit }: { audit: AuditRecord }) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ConfirmButton
        variant="ghost"
        ariaLabel="Delete audit"
        question="Delete this audit?"
        onConfirm={async () => {
          await apiRequest(`/api/audits/${audit.id}`, { method: 'DELETE' });
          router.push(`/projects/${audit.projectId}`);
          router.refresh();
        }}
      >
        <TrashIcon aria-hidden />
        Delete
      </ConfirmButton>
      {audit.status === 'COMPLETED' ? (
        <>
          <a
            className={buttonClass('secondary', 'md')}
            href={`/api/audits/${audit.id}/report`}
            download={`design-validator-${audit.id}.json`}
          >
            <ArrowDownTrayIcon aria-hidden className="text-zinc-400" />
            Download JSON
          </a>
          <RevalidateButton auditId={audit.id} websiteUrl={audit.websiteUrl} />
        </>
      ) : null}
    </div>
  );
}
