'use client';

import { CheckIcon, Square2StackIcon } from '@heroicons/react/16/solid';
import { useState } from 'react';

import { Button } from './button';

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? (
        <CheckIcon aria-hidden className="text-emerald-600" />
      ) : (
        <Square2StackIcon aria-hidden className="text-zinc-400" />
      )}
      <span aria-live="polite">{copied ? 'Copied' : label}</span>
    </Button>
  );
}
