import { cn } from '@/lib/cn';

/** Viewfinder corners around a measured element: the product in one glyph. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-7 shrink-0 items-center justify-center rounded-lg bg-zinc-900 shadow-card ring-1 ring-zinc-950/10',
        className,
      )}
    >
      <svg viewBox="0 0 20 20" fill="none" className="size-[18px]">
        <path
          d="M4 7.5V4h3.5M12.5 4H16v3.5M16 12.5V16h-3.5M7.5 16H4v-3.5"
          stroke="white"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="7.25" y="7.25" width="5.5" height="5.5" rx="1.25" fill="var(--color-brand-500)" />
      </svg>
    </span>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-tight text-zinc-950">
        Design Validator
      </span>
    </span>
  );
}
