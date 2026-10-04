'use client';

import type { Bounds, ValidationIssue } from '@design-validator/design-spec';
import type { ViewportVisual } from '@design-validator/pipeline';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

import { AnnotatedImage } from './annotated-image';

type Mode = 'side-by-side' | 'overlay' | 'difference' | 'blink';
const MODES: { id: Mode; label: string }[] = [
  { id: 'side-by-side', label: 'Side by side' },
  { id: 'overlay', label: 'Overlay' },
  { id: 'difference', label: 'Difference' },
  { id: 'blink', label: 'Blink' },
];

const scaled = (bounds: Bounds | undefined, scale: number): Bounds | null =>
  bounds
    ? {
        x: bounds.x * scale,
        y: bounds.y * scale,
        width: bounds.width * scale,
        height: bounds.height * scale,
      }
    : null;

/**
 * Visual evidence for measured issues (Phase 7). Pixels never create or change
 * issues; selecting an issue highlights its region when the mapping is reliable.
 */
export function VisualComparison({
  auditId,
  visual,
  issue,
}: {
  auditId: string;
  visual: ViewportVisual;
  issue: ValidationIssue | null;
}) {
  const [mode, setMode] = useState<Mode>('side-by-side');
  const [opacity, setOpacity] = useState(50);
  const [blinkDesign, setBlinkDesign] = useState(false);
  const [blinking, setBlinking] = useState(true);
  const base = `/api/audits/${auditId}/artifacts/${visual.viewportId}`;
  const reliable =
    issue && issue.viewportId === visual.viewportId && (issue.evidence.matchConfidence ?? 1) >= 0.8;
  const websiteBox = reliable ? (issue.element.implementationBounds ?? null) : null;
  const designBox = reliable ? scaled(issue.element.designBounds, visual.designScale) : null;

  useEffect(() => {
    if (mode !== 'blink' || !blinking) return;
    // ~1.7 Hz: well under the 3 flashes/second accessibility threshold.
    const timer = setInterval(() => setBlinkDesign((value) => !value), 600);
    return () => clearInterval(timer);
  }, [mode, blinking]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Comparison mode"
          className="inline-flex flex-wrap gap-1 rounded-2xl border-2 border-zinc-950 bg-white p-1 shadow-hard-sm"
        >
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={mode === item.id}
              onClick={() => setMode(item.id)}
              className={cn(
                'rounded-xl px-3 py-1.5 text-sm font-semibold transition-all',
                mode === item.id
                  ? 'bg-zinc-950 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <Badge tone={visual.designImage === 'figma-export' ? 'success' : 'warning'}>
            Design image:{' '}
            {visual.designImage === 'figma-export' ? 'Figma export' : 'rendered from design data'}
          </Badge>
          <span>
            {(visual.mismatchRatio * 100).toFixed(1)}% of pixels differ (evidence, not a score)
          </span>
        </div>
      </div>

      {issue && !reliable ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-inset ring-amber-600/15">
          The selected issue is not highlighted: its element mapping is not reliable enough or it
          belongs to another viewport.
        </p>
      ) : null}

      <div className="max-h-[75vh] overflow-auto rounded-2xl border-2 border-zinc-950 bg-zinc-100">
        {mode === 'side-by-side' ? (
          <div className="grid grid-cols-2 gap-px bg-zinc-950/[0.08]">
            <figure className="bg-white">
              <figcaption className="sticky top-0 z-10 border-b border-zinc-950/[0.06] bg-white/90 px-3 py-2 text-xs font-medium text-zinc-700 backdrop-blur">
                Website (current)
              </figcaption>
              <AnnotatedImage
                src={`${base}/website.png`}
                alt="Website screenshot"
                highlight={websiteBox}
              />
            </figure>
            <figure className="bg-white">
              <figcaption className="sticky top-0 z-10 border-b border-zinc-950/[0.06] bg-white/90 px-3 py-2 text-xs font-medium text-zinc-700 backdrop-blur">
                Design (required)
              </figcaption>
              <AnnotatedImage src={`${base}/design.png`} alt="Design image" highlight={designBox} />
            </figure>
          </div>
        ) : null}
        {mode === 'overlay' ? (
          <div className="relative">
            <AnnotatedImage
              src={`${base}/website.png`}
              alt="Website screenshot"
              highlight={websiteBox}
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{ opacity: opacity / 100 }}
            >
              <AnnotatedImage
                src={`${base}/design.png`}
                alt="Design image overlay"
                highlight={null}
              />
            </div>
          </div>
        ) : null}
        {mode === 'difference' ? (
          <AnnotatedImage
            src={`${base}/diff.png`}
            alt="Pixel difference image; differing pixels in red"
            highlight={websiteBox}
          />
        ) : null}
        {mode === 'blink' ? (
          <AnnotatedImage
            src={`${base}/${blinkDesign ? 'design' : 'website'}.png`}
            alt={blinkDesign ? 'Design image' : 'Website screenshot'}
            highlight={blinkDesign ? designBox : websiteBox}
          />
        ) : null}
      </div>

      {mode === 'overlay' ? (
        <label className="flex items-center gap-3 text-sm">
          Design opacity
          <input
            type="range"
            min={0}
            max={100}
            value={opacity}
            onChange={(event) => setOpacity(Number(event.target.value))}
            className="w-48 accent-brand-600"
            aria-valuetext={`${opacity}%`}
          />
          <span className="w-10 font-mono text-xs">{opacity}%</span>
        </label>
      ) : null}
      {mode === 'blink' ? (
        <div className="flex items-center gap-3 text-sm">
          <Button variant="secondary" size="sm" onClick={() => setBlinking((value) => !value)}>
            {blinking ? 'Pause' : 'Resume'}
          </Button>
          <span aria-live="polite">Showing {blinkDesign ? 'design' : 'website'}</span>
        </div>
      ) : null}
    </div>
  );
}
