'use client';

import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api-client';

export function DeleteProjectButton({ projectId, name }: { projectId: string; name: string }) {
  const router = useRouter();
  return (
    <Button
      variant="danger"
      size="sm"
      onClick={() => {
        if (
          !window.confirm(
            `Delete "${name}" with all of its design sources, audits and screenshots?`,
          )
        )
          return;
        void apiRequest(`/api/projects/${projectId}`, { method: 'DELETE' }).then(() => {
          router.push('/projects');
          router.refresh();
        });
      }}
    >
      Delete project
    </Button>
  );
}
