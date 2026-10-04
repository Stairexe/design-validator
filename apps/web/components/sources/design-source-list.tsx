'use client';

import type { DesignSourceRecord } from '@design-validator/database';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiRequest, errorMessage } from '@/lib/api-client';

export function DesignSourceList({ sources }: { sources: DesignSourceRecord[] }) {
  const router = useRouter();
  const [error, setError] = useState('');

  const remove = async (source: DesignSourceRecord) => {
    if (!window.confirm(`Delete "${source.name}" and the audits that used it?`)) return;
    try {
      await apiRequest(`/api/design-sources/${source.id}`, { method: 'DELETE' });
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  if (sources.length === 0) return <p className="text-sm text-zinc-600">No design sources yet.</p>;
  return (
    <>
      {error ? (
        <p role="alert" className="mb-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <ul className="divide-y divide-zinc-100">
        {sources.map((source) => (
          <li key={source.id} className="flex items-start justify-between gap-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{source.name}</span>
                <Badge tone="info">{source.kind === 'figma' ? 'Figma' : 'Adobe XD'}</Badge>
                {source.uploadObjectKey ? <Badge>Uploaded</Badge> : null}
              </div>
              <p className="mt-0.5 text-xs text-zinc-500">
                {source.frames.length} frame{source.frames.length === 1 ? '' : 's'}:{' '}
                {source.frames
                  .slice(0, 4)
                  .map((frame) => frame.name)
                  .join(', ')}
                {source.frames.length > 4 ? '…' : ''}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void remove(source)}
              aria-label={`Delete ${source.name}`}
            >
              Delete
            </Button>
          </li>
        ))}
      </ul>
    </>
  );
}
