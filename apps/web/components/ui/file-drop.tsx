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
      className={`relative flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-6 text-center transition-colors focus-within:ring-2 focus-within:ring-brand-500 ${
        dragging
          ? 'border-brand-500 bg-brand-50'
          : 'border-zinc-300 bg-zinc-50/60 hover:border-zinc-400 hover:bg-zinc-50'
      }`}
    >
      {fileName ? (
        <DocumentTextIcon aria-hidden className="size-5 text-brand-600" />
      ) : (
        <ArrowUpTrayIcon aria-hidden className="size-5 text-zinc-400" />
      )}
      <span className="text-sm font-medium text-zinc-800">{fileName || prompt}</span>
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
