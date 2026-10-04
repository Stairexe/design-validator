'use client';

import { PlayIcon } from '@heroicons/react/20/solid';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button, Spinner } from '@/components/ui/button';
import { ErrorText } from '@/components/ui/field';
import { apiRequest, errorMessage } from '@/lib/api-client';

/** Creates the bundled sample project + design and starts an audit. */
export function RunSampleButton({
  variant = 'primary',
  size = 'md',
}: {
  variant?: 'primary' | 'brand' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}) {
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
      <Button variant={variant} size={size} onClick={() => void run()} disabled={pending}>
        {pending ? <Spinner /> : <PlayIcon aria-hidden />}
        {pending ? 'Starting…' : 'Run sample audit'}
      </Button>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}
