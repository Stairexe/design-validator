import {
  ArrowTopRightOnSquareIcon,
  ClipboardDocumentCheckIcon,
  CodeBracketIcon,
  PlusIcon,
  SwatchIcon,
} from '@heroicons/react/20/solid';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AuditTable } from '@/components/audit/audit-table';
import { EmptyState } from '@/components/layout/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { DeleteProjectButton } from '@/components/projects/delete-project-button';
import { ProjectAvatar } from '@/components/projects/project-avatar';
import { SourceRepositoryForm } from '@/components/projects/source-repository-form';
import { AddDesignSource } from '@/components/sources/add-design-source';
import { DesignSourceList } from '@/components/sources/design-source-list';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { displayUrl } from '@/lib/labels';
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
      <PageHeader
        breadcrumbs={[{ label: 'Projects', href: '/projects' }]}
        title={
          <span className="flex items-center gap-3">
            <ProjectAvatar name={project.name} size="lg" />
            {project.name}
          </span>
        }
        description={
          <a
            href={project.websiteUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 break-all text-sm font-medium text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950"
          >
            {displayUrl(project.websiteUrl)}
            <ArrowTopRightOnSquareIcon aria-hidden className="size-3.5 shrink-0 text-zinc-400" />
          </a>
        }
        actions={
          <>
            <DeleteProjectButton projectId={project.id} name={project.name} />
            {sources.length > 0 ? (
              <ButtonLink href={`/audits/new?projectId=${project.id}`}>
                <PlusIcon aria-hidden />
                New audit
              </ButtonLink>
            ) : null}
          </>
        }
      />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              icon={<ClipboardDocumentCheckIcon />}
              title="Audits"
              description="Each audit lists the measured differences per screen size."
            />
            {audits.length > 0 ? (
              <AuditTable audits={audits} />
            ) : (
              <EmptyState
                title={sources.length > 0 ? 'Ready for the first audit' : 'Add a design first'}
                action={
                  sources.length > 0 ? (
                    <ButtonLink href={`/audits/new?projectId=${project.id}`}>
                      <PlusIcon aria-hidden />
                      Start an audit
                    </ButtonLink>
                  ) : null
                }
              >
                {sources.length > 0
                  ? 'Audits check the live page against the design and list every difference.'
                  : 'Audits compare the website with a design. Add a Figma or Adobe XD design using the panel on the right.'}
              </EmptyState>
            )}
          </Card>
          <Card>
            <CardHeader
              icon={<SwatchIcon />}
              title="Designs"
              description="The Figma and Adobe XD files this page should match."
            />
            <DesignSourceList sources={sources} />
          </Card>
        </div>
        <div className="space-y-6 lg:sticky lg:top-10">
          <Card>
            <CardHeader title="Add a design" description="Choose where the design comes from." />
            <CardBody>
              <AddDesignSource
                projectId={project.id}
                figmaTokenConfigured={Boolean(deps.figmaAccessToken)}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader
              icon={<CodeBracketIcon />}
              title="Source code"
              description="Optional. Point each difference to the CSS line to change."
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
