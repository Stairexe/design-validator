'use client';

import type { DesignSourceRecord } from '@design-validator/database';
import { DEFAULT_TOLERANCES, type ComparisonTolerances } from '@design-validator/design-spec';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type SyntheticEvent } from 'react';

import { Button } from '@/components/ui/button';
import { ErrorText, Field, Input, Select } from '@/components/ui/field';
import { apiRequest, errorMessage } from '@/lib/api-client';
import { formText } from '@/lib/forms';

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
  const addRow = () => {
    const preset = PRESETS.find((candidate) => !rows.some((row) => row.id === candidate.id)) ?? {
      id: `custom-${rows.length + 1}`,
      label: 'Custom',
      width: 1280,
      height: 800,
    };
    setRows((current) => [
      ...current,
      { key: Date.now(), ...preset, designNodeId: closestFrame(source, preset.width) },
    ]);
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
    <form onSubmit={(event) => void submit(event)} className="space-y-6">
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">Website</legend>
        <Field label="URL" htmlFor="websiteUrl">
          <Input id="websiteUrl" name="websiteUrl" type="url" required defaultValue={websiteUrl} />
        </Field>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">Design</legend>
        <Field label="Design source" htmlFor="designSource">
          <Select
            id="designSource"
            value={sourceId}
            onChange={(event) => changeSource(event.target.value)}
          >
            {sources.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </Select>
        </Field>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Viewports</legend>
        <p className="text-xs text-zinc-500">
          Each viewport is validated independently against its design frame. Results are never
          averaged.
        </p>
        {rows.map((row) => (
          <div
            key={row.key}
            className="grid grid-cols-2 gap-3 rounded-md border border-zinc-200 p-3 sm:grid-cols-5"
          >
            <Field label="ID" htmlFor={`vp-id-${row.key}`}>
              <Input
                id={`vp-id-${row.key}`}
                value={row.id}
                pattern="[a-z0-9-]+"
                required
                onChange={(event) => updateRow(row.key, { id: event.target.value })}
              />
            </Field>
            <Field label="Width" htmlFor={`vp-w-${row.key}`}>
              <Input
                id={`vp-w-${row.key}`}
                type="number"
                min={240}
                max={3840}
                value={row.width}
                required
                onChange={(event) => updateRow(row.key, { width: Number(event.target.value) })}
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
                onChange={(event) => updateRow(row.key, { height: Number(event.target.value) })}
              />
            </Field>
            <div className="col-span-2">
              <Field label="Design frame" htmlFor={`vp-frame-${row.key}`}>
                <div className="flex gap-2">
                  <Select
                    id={`vp-frame-${row.key}`}
                    value={row.designNodeId}
                    required
                    onChange={(event) => updateRow(row.key, { designNodeId: event.target.value })}
                  >
                    {(source?.frames ?? []).map((frame) => (
                      <option key={frame.nodeId} value={frame.nodeId}>
                        {frame.name} {frame.width ? `(${frame.width}×${frame.height ?? '?'})` : ''}
                      </option>
                    ))}
                  </Select>
                  {rows.length > 1 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-10"
                      aria-label={`Remove viewport ${row.id}`}
                      onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              </Field>
            </div>
          </div>
        ))}
        {rows.length < 6 ? (
          <Button variant="secondary" size="sm" onClick={addRow}>
            Add viewport
          </Button>
        ) : null}
      </fieldset>

      <details className="rounded-md border border-zinc-200 p-3">
        <summary className="cursor-pointer text-sm font-semibold">Comparison settings</summary>
        <p className="mt-2 text-xs text-zinc-500">
          Differences at or below a tolerance are treated as rendering noise.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
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
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={visualDiff}
            onChange={(event) => setVisualDiff(event.target.checked)}
            className="size-4"
          />
          Build visual comparison (screenshots, overlay, difference image)
        </label>
      </details>

      <ErrorText>{error}</ErrorText>
      <Button type="submit" disabled={pending || !sourceId}>
        {pending ? 'Starting…' : 'Run validation'}
      </Button>
    </form>
  );
}
