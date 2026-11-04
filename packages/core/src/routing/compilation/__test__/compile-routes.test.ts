// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { Component } from 'svelte';
import type {
  AccessPolicy,
  LayoutComponent,
  ModuleRoutes,
  PageLoader,
  RouteWrapper,
} from '@scylla/core-sdk';
import { LIST_USERS } from '../../__test__/test-permission.fixture.ts';
import { compileRoutes, type AppRouterConfig, type CompiledRoute } from '../compile-routes.ts';
import { flattenModuleRoutes } from '../flatten-routes.ts';
import { joinPath } from '../route-path.ts';

const page: PageLoader = () => Promise.resolve({ default: {} as never });
const crumb = (label: string) => () => ({ label: { id: label, message: label } });
const Layout = {} as LayoutComponent;
const WorkspaceWrapper = {} as RouteWrapper;
const ProjectWrapper = {} as RouteWrapper;
const guard = {} as AccessPolicy['guard'];

const configWith = (...routes: ModuleRoutes[]): AppRouterConfig => ({
  mounts: {
    public: {},
    app: { layout: Layout, shell: true },
    workspace: {
      parent: 'app',
      path: ':workspaceSlug',
      wrapper: WorkspaceWrapper,
      breadcrumb: crumb('Workspace'),
    },
    instance: {
      parent: 'workspace',
      path: 'instance',
      rootCrumb: true,
      breadcrumb: crumb('Instance'),
    },
    project: {
      parent: 'workspace',
      path: 'projects/:projectId',
      wrapper: ProjectWrapper,
      breadcrumb: crumb('Project'),
    },
  },
  modules: routes.map((declared, index) => ({ id: `module-${index}`, routes: declared })),
  fallback: {} as Component,
  guard,
});

const compile = (...routes: ModuleRoutes[]) => compileRoutes(configWith(...routes)).routes;
const paths = (...routes: ModuleRoutes[]) => compile(...routes).map(route => joinPath(route.path));
const routeAt = (path: string, ...routes: ModuleRoutes[]) =>
  compile(...routes).find(route => joinPath(route.path) === path);
const labelsOf = (route?: CompiledRoute) =>
  route?.trail.map(mark => (mark.breadcrumb({}).label as { message: string }).message);

describe('flattenModuleRoutes', () => {
  it('gives each child the path of its parents', () => {
    const flat = flattenModuleRoutes([
      {
        id: 'agents',
        routes: {
          workspace: [{ path: 'agents', page, children: [{ path: ':agentId/logs', page }] }],
        },
      },
    ]);

    expect(flat.map(route => joinPath(route.path))).toEqual(['/agents', '/agents/:agentId/logs']);
  });

  it("makes a child without a path its parent's own page", () => {
    const flat = flattenModuleRoutes([
      {
        id: 'agents',
        routes: {
          workspace: [{ path: 'agents', breadcrumb: crumb('Agents'), children: [{ page }] }],
        },
      },
    ]);

    expect(flat).toHaveLength(1);
    expect(flat[0]).toMatchObject({ path: ['agents'], page });
    expect(flat[0].breadcrumb).toBeDefined();
  });

  it('merges what two modules declare on one path, whatever they name the parameters', () => {
    const flat = flattenModuleRoutes([
      { id: 'user', routes: { workspace: [{ path: 'users/:id', breadcrumb: crumb('User') }] } },
      { id: 'workspace', routes: { workspace: [{ path: 'users/:userId', page }] } },
    ]);

    expect(flat).toHaveLength(1);
    expect(flat[0].declaredBy).toEqual(['user', 'workspace']);
  });

  it('keeps apart the same path under two mounts', () => {
    const flat = flattenModuleRoutes([
      {
        id: 'membership',
        routes: { workspace: [{ path: 'members', page }], project: [{ path: 'members', page }] },
      },
    ]);

    expect(flat).toHaveLength(2);
  });

  it('refuses a field that two declarations of one path both set', () => {
    const declare = () =>
      flattenModuleRoutes([
        { id: 'first', routes: { workspace: [{ path: 'users', page }] } },
        { id: 'second', routes: { workspace: [{ path: 'users', page }] } },
      ]);

    expect(declare).toThrow(/"\/users" declares `page` twice \(first, second\)/);
  });

  it('refuses a route with both a page and a redirect', () => {
    expect(() =>
      flattenModuleRoutes([
        { id: 'm', routes: { workspace: [{ path: 'a', page, redirect: 'b' }] } },
      ]),
    ).toThrow(/both a `page` and a `redirect`/);
  });

  it('refuses a permission without a page to guard', () => {
    expect(() =>
      flattenModuleRoutes([
        { id: 'm', routes: { workspace: [{ path: 'a', permission: LIST_USERS }] } },
      ]),
    ).toThrow(/`permission` or a `nav` but no `page`/);
  });
});

describe('compileRoutes', () => {
  it('places each route under the path of its mount', () => {
    expect(
      paths({
        public: [{ path: 'login', page }],
        workspace: [{ path: 'agents', page }],
        project: [{ path: 'secrets', page }],
      }),
    ).toEqual([
      '/login',
      '/:workspaceSlug/agents',
      '/:workspaceSlug/projects/:projectId/secrets',
    ]);
  });

  it('keeps only the routes that render something: a page or a redirect', () => {
    expect(
      paths({
        workspace: [{ redirect: 'dashboard' }, { path: 'users', breadcrumb: crumb('Users') }],
      }),
    ).toEqual(['/:workspaceSlug']);
  });

  it('puts a static segment before a parameter, so /login is tried before /:workspaceSlug', () => {
    expect(paths({ workspace: [{ page }] }, { public: [{ path: 'login', page }] })).toEqual([
      '/login',
      '/:workspaceSlug',
    ]);
  });

  it('gives a route the layout of its root mount and the wrappers of its mounts, outermost first', () => {
    const route = routeAt('/:workspaceSlug/projects/:projectId/secrets', {
      project: [{ path: 'secrets', page }],
    });

    expect(route?.layout).toBe(Layout);
    expect(route?.wrappers).toEqual([WorkspaceWrapper, ProjectWrapper]);
  });

  it('gives a public route no layout, no shell and no wrapper', () => {
    const route = routeAt('/login', { public: [{ path: 'login', page }] });

    expect(route?.layout).toBeUndefined();
    expect(route?.shell).toBe(false);
    expect(route?.wrappers).toEqual([]);
  });

  it('puts in the shell every page below a root mount that asks for it', () => {
    const route = routeAt('/:workspaceSlug/projects/:projectId/secrets', {
      project: [{ path: 'secrets', page }],
    });

    expect(route?.shell).toBe(true);
  });

  it('refuses a route on a mount that no extension declares', () => {
    expect(() => compile({ nowhere: [{ path: 'a', page }] })).toThrow(
      /No extension declares the mount "nowhere"/,
    );
  });

  it('refuses a permission when no extension gives an access policy', () => {
    expect(() =>
      compileRoutes({
        ...configWith({ workspace: [{ path: 'users', permission: LIST_USERS, page }] }),
        guard: undefined,
      }),
    ).toThrow(/"\/:workspaceSlug\/users" declares a `permission`, but no extension gives an access policy/);
  });

  it("keeps a route's own permission, and never lends it to a child", () => {
    const routes = {
      workspace: [
        {
          path: 'users',
          permission: LIST_USERS,
          page,
          children: [{ path: ':userId', page }],
        },
      ],
    };

    expect(routeAt('/:workspaceSlug/users', routes)?.permission).toBe(LIST_USERS);
    expect(routeAt('/:workspaceSlug/users/:userId', routes)?.permission).toBeUndefined();
  });

  describe('the trail of a page', () => {
    it('holds the crumb of every path it starts with, from the root, with the depth of each', () => {
      const route = routeAt(
        '/:workspaceSlug/projects/:projectId/pipelines/:pipelineId/jobs/:jobId',
        { project: [{ path: 'pipelines/:pipelineId/jobs', breadcrumb: crumb('Jobs') }] },
        {
          project: [{ path: 'pipelines/:pipelineId/jobs/:jobId', breadcrumb: crumb('Job'), page }],
        },
        { workspace: [{ path: 'projects', breadcrumb: crumb('Projects'), page }] },
      );

      expect(labelsOf(route)).toEqual(['Workspace', 'Projects', 'Project', 'Jobs', 'Job']);
      expect(route?.trail.map(mark => mark.depth)).toEqual([1, 2, 3, 6, 7]);
    });

    it('skips the crumbs of paths the page is not under', () => {
      const route = routeAt('/:workspaceSlug/agents', {
        workspace: [
          { path: 'agents', page },
          { path: 'users', breadcrumb: crumb('Users') },
        ],
      });

      expect(labelsOf(route)).toEqual(['Workspace']);
    });

    it('starts at a mount with a root crumb', () => {
      const route = routeAt('/:workspaceSlug/instance/users', {
        instance: [{ path: 'users', breadcrumb: crumb('Users'), page }],
      });

      expect(labelsOf(route)).toEqual(['Instance', 'Users']);
    });
  });

  it('refuses two pages that two mounts put on one URL', () => {
    expect(() =>
      compile({ workspace: [{ path: 'projects/:id', page }], project: [{ page }] }),
    ).toThrow(/Two mounts declare a page on "\/:workspaceSlug\/projects\/:id"/);
  });
});
