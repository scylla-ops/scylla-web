import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { contextStore } from '@scylla/base-sdk';
import { ShellBreadcrumbs, createAppRouter, loadExtensions } from '@scylla/core';
import { navigateTo, setAppNavigator } from '@scylla/core-sdk';
import { extensions } from '../extensions.ts';

const app = loadExtensions(extensions);

const membersPath = '/acme/projects/00000000-0000-4000-8000-0000000000a1/members';
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
    project: { id: '00000000-0000-4000-8000-0000000000a1', name: 'Scylla' },
    pipeline: { id: '00000000-0000-4000-8000-0000000000c1', name: 'Nightly' },
  });
});

afterEach(() => setAppNavigator(null));

describe('the breadcrumb trail that the modules of the extensions compose', () => {
  it('ends on the members of a project', async () => {
    await renderTrailAt(membersPath);

    expect(trail()).toEqual(TRAIL);
  });

  it('names the pipeline of a job one time, before its jobs', async () => {
    await renderTrailAt('/acme/projects/00000000-0000-4000-8000-0000000000a1/pipelines/00000000-0000-4000-8000-0000000000c1/jobs/00000000-0000-4000-8000-0000000000e1');

    expect(trail()).toEqual(['Projects', 'Scylla', 'Pipeline Nightly', 'Jobs', 'Job #00000000-0000-4000-8000-0000000000e1']);
  });

  it('names the pipeline of a new trigger one time, before its triggers', async () => {
    await renderTrailAt('/acme/projects/00000000-0000-4000-8000-0000000000a1/pipelines/00000000-0000-4000-8000-0000000000c1/triggers/new');

    expect(trail()).toEqual(['Projects', 'Scylla', 'Pipeline Nightly', 'Triggers', 'New trigger']);
  });

  it('gives the full id of the current crumb, which can be cut, on a hover', async () => {
    await renderTrailAt('/acme/projects/00000000-0000-4000-8000-0000000000a1/pipelines/00000000-0000-4000-8000-0000000000c1/jobs/00000000-0000-4000-8000-0000000000e1');

    expect(screen.getByTitle('#00000000-0000-4000-8000-0000000000e1').textContent).toBe('#00000000-0000-4000-8000-0000000000e1');
  });
});
