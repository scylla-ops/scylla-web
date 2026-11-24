import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { contextStore } from '@scylla/base-sdk';
import { ShellBreadcrumbs, createAppRouter, loadExtensions } from '@scylla/core';
import { navigateTo, setAppNavigator } from '@scylla/core-sdk';
import { extensions } from '../extensions.ts';

const app = loadExtensions(extensions);

const membersPath = '/acme/projects/project-1/members';
/** The list of the projects, the project, then the page. The top bar shows the workspace apart. */
const TRAIL = ['Projects', 'Scylla', 'Members'];

const trail = () => screen.getAllByRole('listitem').map(item => item.textContent?.trim());

const renderTrailAt = async (path: string) => {
  setAppNavigator(createAppRouter(app.router));
  navigateTo(path);
  render(ShellBreadcrumbs, { contributions: app.shell.contributions });
  await expect.poll(() => window.location.pathname).toBe(path);
};

beforeEach(() => {
  contextStore.setState({
    workspace: { id: 'org-1', name: 'Acme', slug: 'acme' },
    project: { id: 'project-1', name: 'Scylla' },
    pipeline: { id: 'pipeline-1', name: 'Nightly' },
  });
});

afterEach(() => setAppNavigator(null));

describe('the breadcrumb trail that the modules of the extensions compose', () => {
  it('ends on the members of a project', async () => {
    await renderTrailAt(membersPath);

    expect(trail()).toEqual(TRAIL);
  });

  it('names the pipeline of a job one time, before its jobs', async () => {
    await renderTrailAt('/acme/projects/project-1/pipelines/pipeline-1/jobs/job-1');

    expect(trail()).toEqual(['Projects', 'Scylla', 'Pipeline #Nightly', 'Jobs', 'Job #job-1']);
  });

  it('names the pipeline of a new trigger one time, before its triggers', async () => {
    await renderTrailAt('/acme/projects/project-1/pipelines/pipeline-1/triggers/new');

    expect(trail()).toEqual(['Projects', 'Scylla', 'Pipeline #Nightly', 'Triggers', 'New trigger']);
  });

  it('gives the full id of the current crumb, which can be cut, on a hover', async () => {
    await renderTrailAt('/acme/projects/project-1/pipelines/pipeline-1/jobs/job-1');

    expect(screen.getByTitle('job-1').textContent).toBe('#job-1');
  });
});
