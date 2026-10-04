import type { ReactNode } from 'react';

export function PageHeader({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description ? <p className="mt-1 text-sm text-zinc-600">{description}</p> : null}
    </div>
  );
}
