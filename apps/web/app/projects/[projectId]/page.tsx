import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AuditTable } from '@/components/audit/audit-table';
import { PageHeader } from '@/components/layout/page-header';
import { DeleteProjectButton } from '@/components/projects/delete-project-button';
import { SourceRepositoryForm } from '@/components/projects/source-repository-form';
import { AddDesignSource } from '@/components/sources/add-design-source';
import { DesignSourceList } from '@/components/sources/design-source-list';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { getDeps } from '@/lib/server/runtime';

export const metadata: Metadata = { title: 'Project' };
export const dynamic = 'force-dynamic';

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const deps = getDeps();
  const project = await deps.repository.getProject(projectId);
  if (!project) notFound();
  const [sources, audits] = await Promise.all([
    deps.repository.listDesignSources(projectId),
    deps.repository.listAudits({ projectId }),
  ]);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title={project.name}
          description={<span className="break-all font-mono text-xs">{project.websiteUrl}</span>}
        />
        <div className="flex gap-2">
          {sources.length > 0 ? (
            <ButtonLink href={`/audits/new?projectId=${project.id}`}>New audit</ButtonLink>
          ) : null}
          <DeleteProjectButton projectId={project.id} name={project.name} />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title="Audits"
              description="Each audit lists measured differences per viewport."
            />
            {audits.length > 0 ? (
              <AuditTable audits={audits} />
            ) : (
              <CardBody className="text-sm text-zinc-600">No audits yet.</CardBody>
            )}
          </Card>
          <Card>
            <CardHeader
              title="Design sources"
              description="Figma files, Figma exports and Adobe XD manifests."
            />
            <CardBody>
              <DesignSourceList sources={sources} />
            </CardBody>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Add design source" />
            <CardBody>
              <AddDesignSource
                projectId={project.id}
                figmaTokenConfigured={Boolean(deps.figmaAccessToken)}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader
              title="Source code"
              description="Optional: map issues to CSS in a public GitHub repository."
            />
            <CardBody>
              <SourceRepositoryForm projectId={project.id} repository={project.sourceRepository} />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
