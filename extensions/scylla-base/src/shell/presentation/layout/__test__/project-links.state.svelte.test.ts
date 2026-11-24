import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import type { ProjectEntity } from '@base/features/project';
import { withQueryClient, withRegistry } from '@test/render.ts';
import { projectLinks } from '../project-links.state.svelte.ts';

const project = (id: string, name: string): ProjectEntity => ({ id, workspaceId: 'org-1', name });

const repository = { getByWorkspaceId: vi.fn() };

let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;
let cleanups: (() => void)[];

const grantProjectList = () =>
  permissionsStore.setState({
    permissions: {
      scopes: [
        {
          scope: PermissionScope.WORKSPACE,
          scopeId: 'org-1',
          access: { kind: 'restricted', permissions: [Permission.LIST_PROJECTS_BY_WORKSPACE] },
        },
      ],
    },
  });

const mount = (shown: string | undefined) => {
  let links!: ReturnType<typeof projectLinks>;
  cleanups.push(
    $effect.root(() => {
      links = projectLinks(() => shown);
    }),
  );
  flushSync();
  return links;
};

beforeEach(() => {
  cache = withQueryClient();
  cleanups = [];
  repository.getByWorkspaceId
    .mockReset()
    .mockResolvedValue({ items: [project('p-1', 'feu'), project('p-2', 'td')] });
  restoreRegistry = withRegistry({ project: { projectRepository: repository } });
  grantProjectList();
  contextStore.setState({
    workspace: { id: 'org-1', name: 'Acme Corp', slug: 'acme' },
    project: { id: null, name: null },
  });
});

afterEach(() => {
  cleanups.forEach(cleanup => cleanup());
  cache.restore();
  restoreRegistry();
  permissionsStore.setState({ permissions: null });
});

describe('projectLinks', () => {
  it('gives a link to each project of the workspace while the projects show', async () => {
    const links = mount('projects');

    await vi.waitFor(() =>
      expect(links().map(({ title, href }) => ({ title, href }))).toEqual([
        { title: 'feu', href: '/acme/projects/p-1' },
        { title: 'td', href: '/acme/projects/p-2' },
      ]),
    );
    expect(repository.getByWorkspaceId).toHaveBeenCalledWith('org-1', expect.anything());
  });

  it('reads nothing while another item shows', async () => {
    const links = mount('dashboard');
    await new Promise(resolve => setTimeout(resolve));

    expect(links()).toEqual([]);
    expect(repository.getByWorkspaceId).not.toHaveBeenCalled();
  });

  it('reads nothing without the permission to list the projects', async () => {
    permissionsStore.setState({ permissions: { scopes: [] } });
    const links = mount('projects');
    await new Promise(resolve => setTimeout(resolve));

    expect(links()).toEqual([]);
    expect(repository.getByWorkspaceId).not.toHaveBeenCalled();
  });
});
