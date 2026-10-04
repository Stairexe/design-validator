'use client';

import { CheckCircleIcon } from '@heroicons/react/16/solid';
import { useRouter } from 'next/navigation';
import { useState, type SyntheticEvent } from 'react';

import { Button, Spinner } from '@/components/ui/button';
import { ErrorText, Field, Input } from '@/components/ui/field';
import { FileDrop } from '@/components/ui/file-drop';
import { apiRequest, errorMessage } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { formFile, formText } from '@/lib/forms';

type Mode = 'figma-url' | 'figma-export' | 'xd' | 'sample';

const MODES: { id: Mode; label: string; description: string }[] = [
  { id: 'figma-url', label: 'Figma link', description: 'Paste a file URL' },
  { id: 'figma-export', label: 'Figma export', description: 'Upload a JSON export' },
  { id: 'xd', label: 'Adobe XD', description: 'Upload a plugin manifest' },
  { id: 'sample', label: 'Sample design', description: 'Try it with our example' },
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
  const [added, setAdded] = useState(false);

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = formText(form, 'name').trim() || undefined;
    setPending(true);
    setError('');
    setAdded(false);
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
      formElement.reset();
      setAdded(true);
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-5">
      <div role="radiogroup" aria-label="Design source type" className="grid grid-cols-2 gap-2">
        {MODES.map((item) => {
          const active = mode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                setMode(item.id);
                setError('');
                setAdded(false);
              }}
              className={cn(
                'rounded-xl px-3 py-2.5 text-left ring-1 transition-[box-shadow,background-color]',
                active
                  ? 'bg-brand-50/70 ring-2 ring-brand-500'
                  : 'bg-white ring-zinc-950/10 hover:bg-zinc-50 hover:ring-zinc-950/20',
              )}
            >
              <span className="block text-[13px] font-medium text-zinc-950">{item.label}</span>
              <span className="block text-xs text-zinc-500">{item.description}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        {mode === 'figma-url' ? (
          <Field
            label="Figma file link"
            htmlFor="figmaUrl"
            hint={
              figmaTokenConfigured
                ? 'Copy the link from Figma’s Share button. The server token needs access to the file.'
                : 'Figma links need a Figma token on the server (see Settings). Upload a Figma export instead.'
            }
          >
            <Input
              id="figmaUrl"
              name="figmaUrl"
              type="url"
              required
              disabled={!figmaTokenConfigured}
              placeholder="https://www.figma.com/design/…"
            />
          </Field>
        ) : null}
        {mode === 'figma-export' ? (
          <>
            <Field
              label="Figma nodes export"
              htmlFor="file"
              hint="The JSON response of GET /v1/files/:key/nodes for the frames to check."
            >
              <FileDrop id="file" name="file" accept="application/json,.json" required />
            </Field>
            <Field label="Figma file link (optional)" htmlFor="figmaUrl">
              <Input
                id="figmaUrl"
                name="figmaUrl"
                type="url"
                placeholder="https://www.figma.com/design/…"
              />
            </Field>
          </>
        ) : null}
        {mode === 'xd' ? (
          <Field
            label="Adobe XD manifest"
            htmlFor="file"
            hint="Exported with the Design Validator plugin for Adobe XD."
          >
            <FileDrop id="file" name="file" accept="application/json,.json" required />
          </Field>
        ) : null}
        {mode === 'sample' ? (
          <p className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600 ring-1 ring-inset ring-zinc-950/5">
            Adds our sample pricing-page design with desktop and mobile frames. Useful for trying
            the flow end to end.
          </p>
        ) : null}
        {mode !== 'sample' ? (
          <Field label="Name (optional)" htmlFor="source-name">
            <Input id="source-name" name="name" maxLength={120} placeholder="Pricing page v2" />
          </Field>
        ) : null}
        <ErrorText>{error}</ErrorText>
        {added ? (
          <p role="status" className="flex items-center gap-1.5 text-sm text-emerald-700">
            <CheckCircleIcon aria-hidden className="size-4" />
            Design added. You can start an audit now.
          </p>
        ) : null}
        <Button
          type="submit"
          className="w-full"
          disabled={pending || (mode === 'figma-url' && !figmaTokenConfigured)}
        >
          {pending ? <Spinner /> : null}
          {pending ? 'Adding…' : 'Add design'}
        </Button>
      </form>
    </div>
  );
}
