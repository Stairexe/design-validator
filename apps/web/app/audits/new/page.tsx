import { ChevronRightIcon } from '@heroicons/react/16/solid';
import { FolderPlusIcon } from '@heroicons/react/20/solid';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { NewAuditForm } from '@/components/audit/new-audit-form';
import { EmptyState } from '@/components/layout/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { ProjectAvatar } from '@/components/projects/project-avatar';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { displayUrl } from '@/lib/labels';
import { getDeps } from '@/lib/server/runtime';

export const metadata: Metadata = { title: 'New audit' };
export const dynamic = 'force-dynamic';

async function ProjectPicker() {
  const projects = await getDeps().repository.listProjects();
  return (
    <>
      <PageHeader title="New audit" description="Which page do you want to check?" />
      <Card className="max-w-2xl">
        {projects.length === 0 ? (
          <EmptyState
            icon={<FolderPlusIcon />}
            title="Create a project first"
            action={<ButtonLink href="/projects">Create a project</ButtonLink>}
          >
            A project holds the page address and its designs. It takes a few seconds.
          </EmptyState>
        ) : (
          <>
            <CardHeader title="Choose a project" />
            <ul className="divide-y divide-zinc-950/[0.05]">
              {projects.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/audits/new?projectId=${project.id}`}
                    className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-zinc-50"
                  >
                    <ProjectAvatar name={project.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-zinc-950">{project.name}</span>
                      <span className="block truncate text-[13px] text-zinc-500">
                        {displayUrl(project.websiteUrl)}
                      </span>
                    </span>
                    <ChevronRightIcon
                      aria-hidden
                      className="size-4 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-500"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </>
  );
}

export default async function NewAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const { projectId } = await searchParams;
  if (!projectId) return <ProjectPicker />;
  const { repository } = getDeps();
  const project = await repository.getProject(projectId);
  if (!project) notFound();
  const sources = await repository.listDesignSources(project.id);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          { label: project.name, href: `/projects/${project.id}` },
        ]}
        title="New audit"
        description="Pick the design and screen sizes. The audit takes about a minute."
      />
      {sources.length === 0 ? (
        <Card className="max-w-2xl">
          <EmptyState
            title="Add a design to this project first"
            action={
              <ButtonLink href={`/projects/${project.id}`} variant="secondary">
                Back to project
              </ButtonLink>
            }
          >
            Audits compare the website with a Figma or Adobe XD design.
          </EmptyState>
        </Card>
      ) : (
        <NewAuditForm projectId={project.id} websiteUrl={project.websiteUrl} sources={sources} />
      )}
    </>
  );
}
