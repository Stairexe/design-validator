'use client';

import { ArrowUpTrayIcon, DocumentTextIcon } from '@heroicons/react/20/solid';
import { useState } from 'react';

/** File picker styled as a drop area. The input stays in the form for FormData. */
export function FileDrop({
  id,
  name,
  accept,
  required,
  prompt = 'Choose a JSON file',
}: {
  id: string;
  name: string;
  accept: string;
  required?: boolean;
  prompt?: string;
}) {
  const [fileName, setFileName] = useState('');
  const [dragging, setDragging] = useState(false);
  return (
    <label
      htmlFor={id}
      onDragEnter={() => setDragging(true)}
      onDragLeave={() => setDragging(false)}
      onDrop={() => setDragging(false)}
      className={`relative flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-7 text-center transition-all focus-within:border-zinc-950 focus-within:shadow-hard-sm ${
        dragging
          ? 'border-zinc-950 bg-zest-200'
          : 'border-zinc-950/25 bg-zinc-50 hover:border-zinc-950 hover:bg-zest-50'
      }`}
    >
      {fileName ? (
        <DocumentTextIcon aria-hidden className="size-6 text-brand-600" />
      ) : (
        <ArrowUpTrayIcon aria-hidden className="size-6 animate-float text-pop-500" />
      )}
      <span className="font-display text-[15px] font-bold text-zinc-950">{fileName || prompt}</span>
      <span className="text-xs text-zinc-500">
        {fileName
          ? 'Click to choose another file'
          : 'Drop it here or click to browse · up to 10 MB'}
      </span>
      <input
        id={id}
        name={name}
        type="file"
        accept={accept}
        required={required}
        className="absolute inset-0 cursor-pointer opacity-0"
        onChange={(event) => setFileName(event.currentTarget.files?.[0]?.name ?? '')}
      />
    </label>
  );
}
