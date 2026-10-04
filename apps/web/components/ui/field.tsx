import { ChevronUpDownIcon, ExclamationCircleIcon } from '@heroicons/react/20/solid';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

const CONTROL =
  'block w-full rounded-xl border-2 border-zinc-950/15 bg-white px-3.5 py-2 text-sm text-zinc-950 transition-[border-color,box-shadow] placeholder:text-zinc-400 hover:border-zinc-950/30 focus:border-zinc-950 focus:shadow-hard-sm focus:outline-none disabled:bg-zinc-100 disabled:text-zinc-500';

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-zinc-900">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs leading-relaxed text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        CONTROL,
        'file:mr-3 file:rounded-lg file:border-0 file:bg-zest-200 file:px-2.5 file:py-1 file:text-[13px] file:font-medium file:text-zinc-700 hover:file:bg-zinc-200',
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn('relative', className)}>
      <select className={cn(CONTROL, 'appearance-none pr-9')} {...props} />
      <ChevronUpDownIcon
        aria-hidden
        className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
      />
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return children ? (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl border-2 border-red-700 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-800"
    >
      <ExclamationCircleIcon aria-hidden className="mt-px size-4 shrink-0 text-red-500" />
      <span>{children}</span>
    </p>
  ) : null;
}
