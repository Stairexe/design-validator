'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { ErrorText } from '@/components/ui/field';
import { apiRequest, errorMessage } from '@/lib/api-client';

/** Creates the bundled sample project + design and starts an audit. */
export function RunSampleButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setPending(true);
    setError('');
    try {
      const { auditId } = await apiRequest<{ auditId: string }>('/api/samples', { body: {} });
      router.push(`/audits/${auditId}`);
    } catch (caught) {
      setError(errorMessage(caught));
      setPending(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button onClick={() => void run()} disabled={pending}>
        {pending ? 'Starting…' : 'Run sample audit'}
      </Button>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}
