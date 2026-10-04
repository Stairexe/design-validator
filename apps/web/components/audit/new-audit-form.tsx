'use client';

import type { DesignSourceRecord } from '@design-validator/database';
import { DEFAULT_TOLERANCES, type ComparisonTolerances } from '@design-validator/design-spec';
import { CheckIcon, PlusIcon, XMarkIcon } from '@heroicons/react/16/solid';
import { AdjustmentsHorizontalIcon, PlayIcon } from '@heroicons/react/20/solid';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type ReactNode, type SyntheticEvent } from 'react';

import { Button, Spinner } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorText, Field, Input, Select } from '@/components/ui/field';
import { apiRequest, errorMessage } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { formText } from '@/lib/forms';
import { deviceKind, displayUrl } from '@/lib/labels';

import { DEVICE_ICONS } from './viewport-chips';

interface ViewportRow {
  key: number;
  id: string;
  label: string;
  width: number;
  height: number;
  designNodeId: string;
}

const PRESETS = [
  { id: 'desktop', label: 'Desktop', width: 1440, height: 900 },
  { id: 'tablet', label: 'Tablet', width: 768, height: 1024 },
  { id: 'mobile', label: 'Mobile', width: 390, height: 844 },
];

const TOLERANCE_FIELDS: { key: keyof ComparisonTolerances; label: string; step: number }[] = [
  { key: 'positionPx', label: 'Position (px)', step: 0.5 },
  { key: 'sizePx', label: 'Size (px)', step: 0.5 },
  { key: 'spacingPx', label: 'Spacing (px)', step: 0.5 },
  { key: 'typographyPx', label: 'Typography (px)', step: 0.5 },
  { key: 'colorDelta', label: 'Color (ΔE)', step: 0.5 },
  { key: 'radiusPx', label: 'Radius (px)', step: 0.5 },
];

/** Picks the frame whose width is closest to the viewport width. */
function closestFrame(source: DesignSourceRecord | undefined, width: number): string {
  const frames = source?.frames ?? [];
  const best = [...frames].sort(
    (a, b) => Math.abs((a.width ?? 0) - width) - Math.abs((b.width ?? 0) - width),
  )[0];
  return best?.nodeId ?? '';
}

function Section({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="p-5 sm:p-6">
      <fieldset>
        <legend className="flex items-center gap-3">
          <span className="flex size-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white tabular-nums">
            {step}
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-zinc-950">{title}</span>
        </legend>
        {description ? <p className="mt-1.5 pl-9 text-sm text-zinc-500">{description}</p> : null}
        <div className="mt-5 space-y-4">{children}</div>
      </fieldset>
    </Card>
  );
}

export function NewAuditForm({
  projectId,
  websiteUrl,
  sources,
}: {
  projectId: string;
  websiteUrl: string;
  sources: DesignSourceRecord[];
}) {
  const router = useRouter();
  const [url, setUrl] = useState(websiteUrl);
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? '');
  const source = useMemo(
    () => sources.find((candidate) => candidate.id === sourceId),
    [sources, sourceId],
  );
  const [rows, setRows] = useState<ViewportRow[]>(() =>
    PRESETS.filter((preset) => preset.id !== 'tablet').map((preset, key) => ({
      key,
      ...preset,
      designNodeId: closestFrame(sources[0], preset.width),
    })),
  );
  const [tolerances, setTolerances] = useState<ComparisonTolerances>(DEFAULT_TOLERANCES);
  const [visualDiff, setVisualDiff] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const changeSource = (id: string) => {
    setSourceId(id);
    const next = sources.find((candidate) => candidate.id === id);
    setRows((current) =>
      current.map((row) => ({ ...row, designNodeId: closestFrame(next, row.width) })),
    );
  };
  const updateRow = (key: number, patch: Partial<ViewportRow>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };
  const togglePreset = (preset: (typeof PRESETS)[number]) => {
    setRows((current) => {
      if (current.some((row) => row.id === preset.id)) {
        return current.length > 1 ? current.filter((row) => row.id !== preset.id) : current;
      }
      const next = { key: Date.now(), ...preset, designNodeId: closestFrame(source, preset.width) };
      return [...current, next].sort((a, b) => b.width - a.width);
    });
  };
  const addCustom = () => {
    setRows((current) => {
      let index = 1;
      while (current.some((row) => row.id === `custom-${index}`)) index += 1;
      return [
        ...current,
        {
          key: Date.now(),
          id: `custom-${index}`,
          label: `Custom ${index}`,
          width: 1280,
          height: 800,
          designNodeId: closestFrame(source, 1280),
        },
      ];
    });
  };

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError('');
    try {
      const { auditId } = await apiRequest<{ auditId: string }>('/api/audits', {
        body: {
          projectId,
          designSourceId: sourceId,
          websiteUrl: formText(form, 'websiteUrl'),
          viewports: rows.map(({ id, label, width, height, designNodeId }) => ({
            id,
            label,
            width,
            height,
            designNodeId,
          })),
          options: { visualDiff, aiRecommendations: false, tolerances, explicitMappings: [] },
        },
      });
      router.push(`/audits/${auditId}`);
    } catch (caught) {
      setError(errorMessage(caught));
      setPending(false);
    }
  };

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
    >
      <div className="space-y-5">
        <Section step={1} title="Website" description="The live page to measure.">
          <Field label="Page address" htmlFor="websiteUrl">
            <Input
              id="websiteUrl"
              name="websiteUrl"
              type="url"
              required
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          </Field>
        </Section>

        <Section step={2} title="Design" description="What the page should look like.">
          <Field label="Design" htmlFor="designSource">
            <Select
              id="designSource"
              value={sourceId}
              onChange={(event) => changeSource(event.target.value)}
            >
              {sources.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name} ({candidate.frames.length} frame
                  {candidate.frames.length === 1 ? '' : 's'})
                </option>
              ))}
            </Select>
          </Field>
        </Section>

        <Section
          step={3}
          title="Screen sizes"
          description="Each size is checked on its own against the matching design frame."
        >
          <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="Screen size presets">
            {PRESETS.map((preset) => {
              const active = rows.some((row) => row.id === preset.id);
              const Icon = DEVICE_ICONS[deviceKind(preset.width)];
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => togglePreset(preset)}
                  className={cn(
                    'relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-left ring-1 transition-[box-shadow,background-color]',
                    active
                      ? 'bg-brand-50/70 ring-2 ring-brand-500'
                      : 'bg-white ring-zinc-950/10 hover:bg-zinc-50 hover:ring-zinc-950/20',
                  )}
                >
                  <Icon
                    aria-hidden
                    className={cn('size-5', active ? 'text-brand-600' : 'text-zinc-400')}
                  />
                  <span>
                    <span className="block text-sm font-medium text-zinc-950">{preset.label}</span>
                    <span className="block font-mono text-xs text-zinc-500">
                      {preset.width}×{preset.height}
                    </span>
                  </span>
                  {active ? (
                    <CheckIcon
                      aria-hidden
                      className="absolute right-3 top-3 size-4 text-brand-600"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          <ul className="space-y-2">
            {rows.map((row) => {
              const Icon = DEVICE_ICONS[deviceKind(row.width)];
              return (
                <li
                  key={row.key}
                  className="grid items-end gap-3 rounded-xl bg-zinc-50 p-3 ring-1 ring-inset ring-zinc-950/5 sm:grid-cols-[8rem_5.5rem_5.5rem_minmax(0,1fr)_auto]"
                >
                  <div className="flex h-9 items-center gap-2 text-sm font-medium text-zinc-800">
                    <Icon aria-hidden className="size-4 text-zinc-400" />
                    {row.label}
                  </div>
                  <Field label="Width" htmlFor={`vp-w-${row.key}`}>
                    <Input
                      id={`vp-w-${row.key}`}
                      type="number"
                      min={240}
                      max={3840}
                      value={row.width}
                      required
                      onChange={(event) =>
                        updateRow(row.key, { width: Number(event.target.value) })
                      }
                    />
                  </Field>
                  <Field label="Height" htmlFor={`vp-h-${row.key}`}>
                    <Input
                      id={`vp-h-${row.key}`}
                      type="number"
                      min={240}
                      max={4000}
                      value={row.height}
                      required
                      onChange={(event) =>
                        updateRow(row.key, { height: Number(event.target.value) })
                      }
                    />
                  </Field>
                  <Field label="Design frame" htmlFor={`vp-frame-${row.key}`}>
                    <Select
                      id={`vp-frame-${row.key}`}
                      value={row.designNodeId}
                      required
                      onChange={(event) => updateRow(row.key, { designNodeId: event.target.value })}
                    >
                      {(source?.frames ?? []).map((frame) => (
                        <option key={frame.nodeId} value={frame.nodeId}>
                          {frame.name}{' '}
                          {frame.width ? `(${frame.width}×${frame.height ?? '?'})` : ''}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Button
                    variant="ghost"
                    size="md"
                    className="px-2"
                    disabled={rows.length === 1}
                    aria-label={`Remove ${row.label}`}
                    onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                  >
                    <XMarkIcon aria-hidden />
                  </Button>
                </li>
              );
            })}
          </ul>
          {rows.length < 6 ? (
            <Button variant="ghost" size="sm" onClick={addCustom}>
              <PlusIcon aria-hidden />
              Add a custom size
            </Button>
          ) : null}
        </Section>

        <Card>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
              <AdjustmentsHorizontalIcon aria-hidden className="size-5 text-zinc-400" />
              <span className="flex-1">
                <span className="block text-[15px] font-semibold tracking-tight text-zinc-950">
                  Advanced settings
                </span>
                <span className="block text-sm text-zinc-500">
                  Tolerances and visual comparison. The defaults suit most pages.
                </span>
              </span>
              <PlusIcon
                aria-hidden
                className="size-4 text-zinc-400 transition-transform group-open:rotate-45"
              />
            </summary>
            <div className="space-y-5 border-t border-zinc-950/[0.06] px-5 py-5 sm:px-6">
              <p className="text-sm text-zinc-500">
                Differences at or below a tolerance are treated as rendering noise and not reported.
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {TOLERANCE_FIELDS.map((field) => (
                  <Field key={field.key} label={field.label} htmlFor={`tol-${field.key}`}>
                    <Input
                      id={`tol-${field.key}`}
                      type="number"
                      min={0}
                      max={100}
                      step={field.step}
                      value={tolerances[field.key]}
                      onChange={(event) =>
                        setTolerances((current) => ({
                          ...current,
                          [field.key]: Number(event.target.value),
                        }))
                      }
                    />
                  </Field>
                ))}
              </div>
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={visualDiff}
                  onChange={(event) => setVisualDiff(event.target.checked)}
                  className="mt-0.5 size-4 rounded accent-brand-600"
                />
                <span>
                  <span className="block font-medium text-zinc-900">Visual comparison</span>
                  <span className="block text-zinc-500">
                    Screenshots side by side, overlay and a pixel difference image.
                  </span>
                </span>
              </label>
            </div>
          </details>
        </Card>
      </div>

      <Card className="space-y-5 p-5 lg:sticky lg:top-10">
        <h2 className="text-[15px] font-semibold tracking-tight text-zinc-950">Summary</h2>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-xs text-zinc-500">Website</dt>
            <dd className="truncate font-medium text-zinc-900">{displayUrl(url) || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Design</dt>
            <dd className="truncate font-medium text-zinc-900">{source?.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Screen sizes</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {rows.map((row) => (
                <span
                  key={row.key}
                  className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-600"
                >
                  {row.width}×{row.height}
                </span>
              ))}
            </dd>
          </div>
        </dl>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" size="lg" className="w-full" disabled={pending || !sourceId}>
          {pending ? <Spinner /> : <PlayIcon aria-hidden />}
          {pending ? 'Starting…' : 'Run audit'}
        </Button>
        <p className="text-center text-xs text-zinc-400">
          You can leave this page; the audit keeps running.
        </p>
      </Card>
    </form>
  );
}
