'use client';

import type { DesignSourceRecord } from '@design-validator/database';
import { TrashIcon } from '@heroicons/react/16/solid';
import { useRouter } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { apiRequest } from '@/lib/api-client';

export function SourceKindTile({ kind }: { kind: DesignSourceRecord['kind'] }) {
  return (
    <span
      aria-hidden
      className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 font-mono text-[11px] font-semibold text-white"
    >
      {kind === 'figma' ? 'Fig' : 'Xd'}
    </span>
  );
}

export function DesignSourceList({ sources }: { sources: DesignSourceRecord[] }) {
  const router = useRouter();

  if (sources.length === 0) {
    return (
      <p className="px-5 py-6 text-sm text-zinc-500">
        No designs yet. Add one with the panel on the right; audits compare the website against it.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-zinc-950/[0.05]">
      {sources.map((source) => (
        <li
          key={source.id}
          className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
        >
          <div className="flex min-w-0 items-center gap-3">
            <SourceKindTile kind={source.kind} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-zinc-950">{source.name}</span>
                <Badge>{source.kind === 'figma' ? 'Figma' : 'Adobe XD'}</Badge>
                {source.uploadObjectKey ? <Badge>Uploaded file</Badge> : null}
              </div>
              <p className="mt-0.5 truncate text-xs text-zinc-500">
                {source.frames.length} frame{source.frames.length === 1 ? '' : 's'}:{' '}
                {source.frames
                  .slice(0, 4)
                  .map((frame) => frame.name)
                  .join(', ')}
                {source.frames.length > 4 ? '…' : ''}
              </p>
            </div>
          </div>
          <ConfirmButton
            variant="ghost"
            ariaLabel={`Delete ${source.name}`}
            question="Delete this design and its audits?"
            onConfirm={async () => {
              await apiRequest(`/api/design-sources/${source.id}`, { method: 'DELETE' });
              router.refresh();
            }}
          >
            <TrashIcon aria-hidden />
          </ConfirmButton>
        </li>
      ))}
    </ul>
  );
}
