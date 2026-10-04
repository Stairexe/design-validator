import { ChevronRightIcon } from '@heroicons/react/16/solid';
import Link from 'next/link';
import type { ReactNode } from 'react';

export interface Crumb {
  label: string;
  href: string;
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  meta,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: Crumb[];
  meta?: ReactNode;
}) {
  return (
    <div className="mb-8 animate-fade-up">
      {breadcrumbs?.length ? (
        <nav aria-label="Breadcrumb" className="mb-3">
          <ol className="flex flex-wrap items-center gap-1 text-[13px] text-zinc-500">
            {breadcrumbs.map((crumb) => (
              <li key={crumb.href} className="flex items-center gap-1">
                <Link
                  href={crumb.href}
                  className="rounded px-0.5 font-semibold transition-colors hover:text-pop-600"
                >
                  {crumb.label}
                </Link>
                <ChevronRightIcon aria-hidden className="size-3.5 text-zinc-300" />
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="font-display text-[32px] font-bold leading-[1.05] tracking-[-0.03em] text-zinc-950 sm:text-[40px]">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-base text-zinc-600">{description}</p>
          ) : null}
          {meta ? <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
