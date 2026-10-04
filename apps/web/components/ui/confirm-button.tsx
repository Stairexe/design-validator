'use client';

import { useState, type ReactNode } from 'react';

import { Button, Spinner } from './button';

/**
 * Two-step destructive action: the first click asks inline, the second acts.
 * Replaces `window.confirm` so the question stays in context.
 */
export function ConfirmButton({
  children,
  question,
  confirmLabel = 'Delete',
  onConfirm,
  variant = 'danger',
  ariaLabel,
}: {
  children: ReactNode;
  question: string;
  confirmLabel?: string;
  onConfirm: () => Promise<unknown>;
  variant?: 'danger' | 'ghost' | 'secondary';
  ariaLabel?: string;
}) {
  const [state, setState] = useState<'idle' | 'asking' | 'pending'>('idle');
  const [error, setError] = useState('');

  if (state === 'idle') {
    return (
      <Button variant={variant} size="sm" aria-label={ariaLabel} onClick={() => setState('asking')}>
        {children}
      </Button>
    );
  }
  return (
    <div
      role="group"
      aria-label={question}
      className="flex animate-fade-up flex-wrap items-center gap-2 rounded-lg bg-red-50 py-1 pl-3 pr-1 ring-1 ring-inset ring-red-600/15"
      onKeyDown={(event) => {
        if (event.key === 'Escape') setState('idle');
      }}
    >
      <span className="text-[13px] font-medium text-red-800">{error || question}</span>
      <Button
        variant="danger"
        size="sm"
        disabled={state === 'pending'}
        onClick={() => {
          setState('pending');
          setError('');
          onConfirm().then(
            () => setState('idle'),
            (caught: unknown) => {
              setError(caught instanceof Error ? caught.message : 'That did not work. Try again.');
              setState('asking');
            },
          );
        }}
      >
        {state === 'pending' ? <Spinner /> : null}
        {confirmLabel}
      </Button>
      <Button variant="ghost" size="sm" autoFocus onClick={() => setState('idle')}>
        Cancel
      </Button>
    </div>
  );
}
