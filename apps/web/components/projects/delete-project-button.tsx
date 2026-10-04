'use client';

import { TrashIcon } from '@heroicons/react/16/solid';
import { useRouter } from 'next/navigation';

import { ConfirmButton } from '@/components/ui/confirm-button';
import { apiRequest } from '@/lib/api-client';

export function DeleteProjectButton({ projectId, name }: { projectId: string; name: string }) {
  const router = useRouter();
  return (
    <ConfirmButton
      variant="secondary"
      question={`Delete "${name}" and all its audits?`}
      confirmLabel="Delete project"
      onConfirm={async () => {
        await apiRequest(`/api/projects/${projectId}`, { method: 'DELETE' });
        router.push('/projects');
        router.refresh();
      }}
    >
      <TrashIcon aria-hidden className="text-zinc-400" />
      Delete
    </ConfirmButton>
  );
}
