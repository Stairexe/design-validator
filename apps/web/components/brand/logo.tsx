import { cn } from '@/lib/cn';

/** Viewfinder corners around a measured element: the product in one glyph. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-8 shrink-0 -rotate-6 items-center justify-center rounded-xl border-2 border-zinc-950 bg-pop-500 shadow-hard-sm transition-transform duration-300 group-hover:rotate-6',
        className,
      )}
    >
      <svg viewBox="0 0 20 20" fill="none" className="size-[18px]">
        <path
          d="M4 7.5V4h3.5M12.5 4H16v3.5M16 12.5V16h-3.5M7.5 16H4v-3.5"
          stroke="var(--color-zinc-950)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect
          x="7.25"
          y="7.25"
          width="5.5"
          height="5.5"
          rx="1.5"
          fill="var(--color-zest-300)"
          stroke="var(--color-zinc-950)"
          strokeWidth="1.5"
        />
      </svg>
    </span>
  );
}

export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="group flex items-center gap-2.5">
      <LogoMark />
      <span
        className={cn(
          'font-display text-[17px] font-bold tracking-tight',
          inverted ? 'text-white' : 'text-zinc-950',
        )}
      >
        Design Validator
      </span>
    </span>
  );
}
