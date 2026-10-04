'use client';

import type { ProjectRecord } from '@design-validator/database';
import { useRouter } from 'next/navigation';
import { useState, type SyntheticEvent } from 'react';

import { Button, Spinner } from '@/components/ui/button';
import { ErrorText, Field, Input } from '@/components/ui/field';
import { apiRequest, errorMessage } from '@/lib/api-client';
import { formText } from '@/lib/forms';

export function CreateProjectForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError('');
    try {
      const { project } = await apiRequest<{ project: ProjectRecord }>('/api/projects', {
        body: {
          name: formText(form, 'name'),
          websiteUrl: formText(form, 'websiteUrl'),
        },
      });
      router.push(`/projects/${project.id}`);
    } catch (caught) {
      setError(errorMessage(caught));
      setPending(false);
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      <Field label="Project name" htmlFor="name">
        <Input id="name" name="name" required maxLength={120} placeholder="Pricing page" />
      </Field>
      <Field
        label="Website URL"
        htmlFor="websiteUrl"
        hint="The live page to check. It must be publicly reachable."
      >
        <Input
          id="websiteUrl"
          name="websiteUrl"
          type="url"
          required
          placeholder="https://example.com/pricing"
        />
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? <Spinner /> : null}
        {pending ? 'Creating…' : 'Create project'}
      </Button>
    </form>
  );
}
