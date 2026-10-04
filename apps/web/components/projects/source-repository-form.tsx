'use client';

import type { SourceRepositoryConfig } from '@design-validator/database';
import { useRouter } from 'next/navigation';
import { useState, type SyntheticEvent } from 'react';

import { Button } from '@/components/ui/button';
import { ErrorText, Field, Input } from '@/components/ui/field';
import { apiRequest, errorMessage } from '@/lib/api-client';
import { formText } from '@/lib/forms';

/** Connects a public GitHub repository used to locate CSS for issues (Phase 10). */
export function SourceRepositoryForm({
  projectId,
  repository,
}: {
  projectId: string;
  repository: SourceRepositoryConfig | null;
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const save = async (sourceRepository: SourceRepositoryConfig | null) => {
    setPending(true);
    setError('');
    try {
      await apiRequest(`/api/projects/${projectId}`, {
        method: 'PATCH',
        body: { sourceRepository },
      });
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  };

  const submit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const [owner = '', repo = ''] = formText(form, 'repository')
      .replace(/^https?:\/\/github\.com\//, '')
      .replace(/\.git$/, '')
      .split('/');
    if (!owner || !repo) {
      setError('Use the form owner/repository.');
      return;
    }
    void save({
      provider: 'github',
      owner,
      repo,
      ref: formText(form, 'ref').trim() || 'main',
    });
  };

  if (repository) {
    return (
      <div className="space-y-3 text-sm">
        <p>
          Connected to{' '}
          <span className="font-mono">
            {repository.owner}/{repository.repo}
          </span>{' '}
          at <span className="font-mono">{repository.ref}</span>.
        </p>
        <ErrorText>{error}</ErrorText>
        <Button variant="secondary" size="sm" disabled={pending} onClick={() => void save(null)}>
          Disconnect
        </Button>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <Field
        label="GitHub repository"
        htmlFor="repository"
        hint="Public repositories only, e.g. acme/website."
      >
        <Input id="repository" name="repository" required placeholder="owner/repository" />
      </Field>
      <Field label="Branch or tag" htmlFor="ref">
        <Input id="ref" name="ref" placeholder="main" />
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        Connect repository
      </Button>
    </form>
  );
}
