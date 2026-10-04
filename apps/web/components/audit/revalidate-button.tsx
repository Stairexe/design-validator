'use client';

import { useRouter } from 'next/navigation';
import { useState, type SyntheticEvent } from 'react';

import { Button } from '@/components/ui/button';
import { ErrorText, Field, Input } from '@/components/ui/field';
import { apiRequest, errorMessage } from '@/lib/api-client';
import { formText } from '@/lib/forms';

/** Re-validates after a fix, optionally against a preview deployment URL (Phase 11). */
export function RevalidateButton({ auditId, websiteUrl }: { auditId: string; websiteUrl: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const url = formText(new FormData(event.currentTarget), 'websiteUrl');
      const { auditId: next } = await apiRequest<{ auditId: string }>(
        `/api/audits/${auditId}/revalidate`,
        { body: url ? { websiteUrl: url } : {} },
      );
      router.push(`/audits/${next}`);
    } catch (caught) {
      setError(errorMessage(caught));
      setPending(false);
    }
  };

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Re-validate
      </Button>
    );
  }
  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="w-full max-w-md space-y-2 rounded-md border border-zinc-200 bg-white p-3"
    >
      <Field
        label="URL to validate"
        htmlFor="revalidate-url"
        hint="Use the preview deployment of your fix, or keep the same URL after deploying."
      >
        <Input
          id="revalidate-url"
          name="websiteUrl"
          type="url"
          defaultValue={websiteUrl}
          required
        />
      </Field>
      <ErrorText>{error}</ErrorText>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Starting…' : 'Run again'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
