import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { contextStore } from '@scylla/base-sdk';
import { ShellBreadcrumbs, createAppRouter, loadExtensions } from '@scylla/core';
import { navigateTo, setAppNavigator } from '@scylla/core-sdk';
import { extensions } from '../extensions.ts';

const app = loadExtensions(extensions);

const membersPath = '/acme/projects/project-1/members';
/** The list of the projects, the project with its name, then the page. */
const TRAIL = ['Projects', 'Project#Scylla', 'Members'];

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
});
