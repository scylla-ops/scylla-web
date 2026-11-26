import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { installTestNavigator } from '@test/navigator.ts';
import { textSnippet } from '@test/render.ts';
import AdminColumn from '../AdminColumn.wrapper.svelte';
import WorkspaceSync from '../WorkspaceSync.wrapper.svelte';

vi.mock('../workspace-sync.effect.svelte.ts', () => ({
  syncWorkspace: () => ({ matched: true }),
}));
vi.mock('../last-workspace.ts', () => ({ rememberWorkspace: vi.fn() }));

const UUID = '00000000-0000-4000-8000-0000000000a1';

let navigator: ReturnType<typeof installTestNavigator>;

beforeEach(() => {
  navigator = installTestNavigator({ pathname: '/acme/x/y' });
});
afterEach(() => navigator.restore());

const workspaceRoutes = [
  ['project', 'projectId'],
  ['pipeline', 'pipelineId'],
  ['job', 'jobId'],
  ['agent or app', 'appId'],
  ['dashboard', 'dashboardId'],
  ['trigger', 'triggerId'],
  ['fragment', 'fragmentId'],
  ['member', 'actorId'],
] as const;

describe('WorkspaceSync.wrapper, an id in the URL', () => {
  it.each(workspaceRoutes)('shows not found for a %s id with a wrong form', (_kind, name) => {
    render(WorkspaceSync, {
      params: { workspaceSlug: 'acme', [name]: '01ZZZZZZZZZZZZZZZZZZZZZZZZ' },
      children: textSnippet('the page'),
    });

    expect(screen.queryByText('the page')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });

  it.each(workspaceRoutes)('shows the page for a %s id with the form of an id', (_kind, name) => {
    render(WorkspaceSync, {
      params: { workspaceSlug: 'acme', [name]: UUID },
      children: textSnippet('the page'),
    });

    expect(screen.getByText('the page')).toBeInTheDocument();
  });
});

describe('AdminColumn.wrapper, an id in the URL', () => {
  it('shows not found for a user id with a wrong form', () => {
    render(AdminColumn, { params: { userId: 'nope' }, children: textSnippet('the page') });

    expect(screen.queryByText('the page')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });

  it('shows the page for a user id with the form of an id', () => {
    render(AdminColumn, { params: { userId: UUID }, children: textSnippet('the page') });

    expect(screen.getByText('the page')).toBeInTheDocument();
  });
});
