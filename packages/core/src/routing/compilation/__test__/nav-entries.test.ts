// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { msg } from '@lingui/core/macro';
import type { NavLink, PageLoader, RouteMount, RouteSource } from '@scylla/core-sdk';
import { testPermission } from '../../__test__/test-permission.fixture.ts';
import { navEntriesFor } from '../nav-entries.ts';
import { splitPath } from '../route-path.ts';

const page: PageLoader = () => Promise.resolve({ default: {} as never });
const nav = (order?: number): NavLink => ({ section: 'workspace', title: msg`Entry`, order });
const moduleWith = (id: string, routes: RouteSource['routes']): RouteSource => ({ id, routes });
const MOUNT_PATHS: Record<RouteMount, string> = {
  workspace: ':workspaceSlug',
  project: ':workspaceSlug/projects/:projectId',
};
const entriesFor = (modules: readonly RouteSource[]) =>
  navEntriesFor(modules, mount => splitPath(MOUNT_PATHS[mount]));
const LIST_AGENTS = testPermission('LIST_AGENTS');

describe('navEntriesFor', () => {
  it("takes the URL and the permission of the link's route", () => {
    const [entry] = entriesFor([
      moduleWith('agents', {
        workspace: [
          {
            path: 'agents',
            children: [{ permission: LIST_AGENTS, page, nav: nav() }],
          },
        ],
      }),
    ]);

    expect(entry).toMatchObject({
      mount: 'workspace',
      url: 'agents',
      pattern: [':workspaceSlug', 'agents'],
      permission: LIST_AGENTS,
    });
  });

  it('sorts by order, an entry without one as 0, then by registration order', () => {
    const entries = entriesFor([
      moduleWith('first', {
        workspace: [
          { path: 'c', page, nav: nav(3) },
          { path: 'a', page, nav: nav() },
        ],
      }),
      moduleWith('second', {
        workspace: [
          { path: 'b', page, nav: nav(-1) },
          { path: 'd', page, nav: nav() },
        ],
      }),
    ]);

    expect(entries.map(entry => entry.url)).toEqual(['b', 'a', 'd', 'c']);
  });

  it('ignores the routes without a link', () => {
    expect(entriesFor([moduleWith('m', { workspace: [{ path: 'a', page }] })])).toEqual([]);
  });

  it('gives a link of another mount the path of that mount', () => {
    const [entry] = entriesFor([
      moduleWith('m', { project: [{ path: 'secrets', page, nav: nav() }] }),
    ]);

    expect(entry.pattern).toEqual([':workspaceSlug', 'projects', ':projectId', 'secrets']);
  });
});
