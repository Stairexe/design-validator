import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { NewAuditForm } from '@/components/audit/new-audit-form';
import { PageHeader } from '@/components/layout/page-header';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { getDeps } from '@/lib/server/runtime';

export const metadata: Metadata = { title: 'New audit' };
export const dynamic = 'force-dynamic';

export default async function NewAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const { projectId } = await searchParams;
  const { repository } = getDeps();
  const project = projectId ? await repository.getProject(projectId) : null;
  if (!project) notFound();
  const sources = await repository.listDesignSources(project.id);

  return (
    <>
      <PageHeader title="New audit" description={`${project.name} · ${project.websiteUrl}`} />
      <Card className="max-w-3xl">
        <CardBody>
          {sources.length === 0 ? (
            <div className="space-y-3 text-sm">
              <p>Add a design source to this project first.</p>
              <ButtonLink href={`/projects/${project.id}`} variant="secondary">
                Back to project
              </ButtonLink>
            </div>
          ) : (
            <NewAuditForm
              projectId={project.id}
              websiteUrl={project.websiteUrl}
              sources={sources}
            />
          )}
        </CardBody>
      </Card>
    </>
  );
}
