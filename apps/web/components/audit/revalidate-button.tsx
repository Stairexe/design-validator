'use client';

import { ArrowPathIcon } from '@heroicons/react/16/solid';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type SyntheticEvent } from 'react';

import { Button, Spinner } from '@/components/ui/button';
import { ErrorText, Field, Input } from '@/components/ui/field';
import { apiRequest, errorMessage } from '@/lib/api-client';
import { formText } from '@/lib/forms';

/** Re-validates after a fix, optionally against a preview deployment URL (Phase 11). */
export function RevalidateButton({ auditId, websiteUrl }: { auditId: string; websiteUrl: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

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

  return (
    <div ref={wrapper} className="relative">
      <Button aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <ArrowPathIcon aria-hidden />
        Re-validate
      </Button>
      {open ? (
        <form
          onSubmit={(event) => void submit(event)}
          className="absolute right-0 top-full z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] animate-fade-up space-y-3 rounded-xl bg-white p-4 shadow-raised ring-1 ring-zinc-950/10"
        >
          <div>
            <p className="text-sm font-semibold text-zinc-950">Check again after a fix</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              The new audit shows what was resolved, what is still different and anything new.
            </p>
          </div>
          <Field
            label="Page address"
            htmlFor="revalidate-url"
            hint="Use a preview deployment of your fix, or the same address after deploying."
          >
            <Input
              id="revalidate-url"
              name="websiteUrl"
              type="url"
              defaultValue={websiteUrl}
              required
              autoFocus
            />
          </Field>
          <ErrorText>{error}</ErrorText>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? <Spinner /> : null}
              {pending ? 'Starting…' : 'Run again'}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
