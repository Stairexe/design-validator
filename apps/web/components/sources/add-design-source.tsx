'use client';

import { useRouter } from 'next/navigation';
import { useState, type SyntheticEvent } from 'react';

import { Button } from '@/components/ui/button';
import { ErrorText, Field, Input } from '@/components/ui/field';
import { apiRequest, errorMessage } from '@/lib/api-client';
import { formFile, formText } from '@/lib/forms';
import { cn } from '@/lib/cn';

type Mode = 'figma-url' | 'figma-export' | 'xd' | 'sample';

const MODES: { id: Mode; label: string }[] = [
  { id: 'figma-url', label: 'Figma URL' },
  { id: 'figma-export', label: 'Figma export' },
  { id: 'xd', label: 'Adobe XD' },
  { id: 'sample', label: 'Sample' },
];

async function readJsonFile(file: File | null): Promise<unknown> {
  if (!file || file.size === 0) throw new Error('Choose a JSON file.');
  if (file.size > 10 * 1024 * 1024) throw new Error('The file exceeds 10 MB.');
  try {
    return JSON.parse(await file.text()) as unknown;
  } catch {
    throw new Error('The file is not valid JSON.');
  }
}

export function AddDesignSource({
  projectId,
  figmaTokenConfigured,
}: {
  projectId: string;
  figmaTokenConfigured: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(figmaTokenConfigured ? 'figma-url' : 'figma-export');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = formText(form, 'name').trim() || undefined;
    setPending(true);
    setError('');
    try {
      if (mode === 'figma-url') {
        await apiRequest('/api/design-sources/figma', {
          body: { projectId, name, figmaUrl: formText(form, 'figmaUrl') },
        });
      } else if (mode === 'figma-export') {
        const figmaUrl = formText(form, 'figmaUrl').trim() || undefined;
        await apiRequest('/api/design-sources/figma', {
          body: {
            projectId,
            name,
            figmaUrl,
            nodesExport: await readJsonFile(formFile(form, 'file')),
          },
        });
      } else if (mode === 'xd') {
        await apiRequest('/api/design-sources/xd', {
          body: { projectId, name, manifest: await readJsonFile(formFile(form, 'file')) },
        });
      } else {
        await apiRequest('/api/design-sources/sample', { body: { projectId } });
      }
      event.currentTarget.reset();
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Design source type"
        className="flex flex-wrap gap-1 rounded-md bg-zinc-100 p-1"
      >
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={mode === item.id}
            onClick={() => {
              setMode(item.id);
              setError('');
            }}
            className={cn(
              'rounded px-3 py-1.5 text-sm font-medium',
              mode === item.id ? 'bg-white shadow-sm' : 'text-zinc-600 hover:text-zinc-900',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        {mode !== 'sample' ? (
          <Field label="Name (optional)" htmlFor="source-name">
            <Input id="source-name" name="name" maxLength={120} placeholder="Pricing page v2" />
          </Field>
        ) : null}
        {mode === 'figma-url' ? (
          <Field
            label="Figma file URL"
            htmlFor="figmaUrl"
            hint={
              figmaTokenConfigured
                ? 'The server token must have access to the file.'
                : 'No Figma token is configured on this server; use a Figma export instead.'
            }
          >
            <Input
              id="figmaUrl"
              name="figmaUrl"
              type="url"
              required
              placeholder="https://www.figma.com/design/FILEKEY/Name"
            />
          </Field>
        ) : null}
        {mode === 'figma-export' ? (
          <>
            <Field
              label="Figma nodes export (JSON)"
              htmlFor="file"
              hint="The response of GET /v1/files/:key/nodes?ids=… for the frames to validate."
            >
              <Input id="file" name="file" type="file" accept="application/json,.json" required />
            </Field>
            <Field label="Figma file URL (optional)" htmlFor="figmaUrl">
              <Input
                id="figmaUrl"
                name="figmaUrl"
                type="url"
                placeholder="https://www.figma.com/design/FILEKEY/Name"
              />
            </Field>
          </>
        ) : null}
        {mode === 'xd' ? (
          <Field
            label="XD manifest (JSON)"
            htmlFor="file"
            hint="Exported with the Design Validator Adobe XD plugin (plugins/adobe-xd)."
          >
            <Input id="file" name="file" type="file" accept="application/json,.json" required />
          </Field>
        ) : null}
        {mode === 'sample' ? (
          <p className="text-sm text-zinc-600">
            Adds the bundled sample pricing design (desktop and mobile frames).
          </p>
        ) : null}
        <ErrorText>{error}</ErrorText>
        <Button type="submit" disabled={pending}>
          {pending ? 'Adding…' : 'Add design source'}
        </Button>
      </form>
    </div>
  );
}
