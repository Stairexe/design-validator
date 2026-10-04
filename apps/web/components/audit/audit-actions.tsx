'use client';

import type { AuditRecord } from '@design-validator/database';
import { useRouter } from 'next/navigation';

import { Button, buttonClass } from '@/components/ui/button';
import { apiRequest } from '@/lib/api-client';

import { RevalidateButton } from './revalidate-button';

export function AuditActions({ audit }: { audit: AuditRecord }) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-2">
      {audit.status === 'COMPLETED' ? (
        <>
          <RevalidateButton auditId={audit.id} websiteUrl={audit.websiteUrl} />
          <a
            className={buttonClass('secondary', 'sm')}
            href={`/api/audits/${audit.id}/report`}
            download={`design-validator-${audit.id}.json`}
          >
            Download JSON
          </a>
        </>
      ) : null}
      <Button
        variant="danger"
        size="sm"
        onClick={() => {
          if (!window.confirm('Delete this audit, its issues and screenshots?')) return;
          void apiRequest(`/api/audits/${audit.id}`, { method: 'DELETE' }).then(() => {
            router.push(`/projects/${audit.projectId}`);
            router.refresh();
          });
        }}
      >
        Delete
      </Button>
    </div>
  );
}
