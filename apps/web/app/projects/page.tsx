import type { Metadata } from 'next';
import Link from 'next/link';

import { EmptyState } from '@/components/layout/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { CreateProjectForm } from '@/components/projects/create-project-form';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { formatDateTime } from '@/lib/labels';
import { getDeps } from '@/lib/server/runtime';

export const metadata: Metadata = { title: 'Projects' };
export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const projects = await getDeps().repository.listProjects();
  return (
    <>
      <PageHeader
        title="Projects"
        description="A project pairs a website URL with its design revisions."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="All projects" />
          {projects.length === 0 ? (
            <CardBody>
              <EmptyState title="No projects yet">
                Create a project to add a design source and run an audit.
              </EmptyState>
            </CardBody>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {projects.map((project) => (
                <li key={project.id} className="px-5 py-3">
                  <Link
                    href={`/projects/${project.id}`}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {project.name}
                  </Link>
                  <div className="flex flex-wrap gap-x-4 text-xs text-zinc-500">
                    <span className="truncate">{project.websiteUrl}</span>
                    <span>Created {formatDateTime(project.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="New project" />
          <CardBody>
            <CreateProjectForm />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
