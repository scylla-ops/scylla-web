import { describe, it, expect } from 'vitest';
import type { Component } from 'svelte';
import { msg } from '@lingui/core/macro';
import {
  Extension,
  type AccessPolicy,
  type ExtensionClass,
  type ExtensionManifest,
  type PageLoader,
  type ScyllaModule,
} from '@scylla/core-sdk';
import { testPermission } from '../../routing/__test__/test-permission.fixture.ts';
import { loadExtensions } from '../load-extensions.ts';

const page: PageLoader = () => Promise.resolve({ default: {} as never });
const Fallback = {} as Component;
const policy = { can: () => true, ready: () => true, guard: {} as never } satisfies AccessPolicy;

const extension = (manifest: ExtensionManifest): ExtensionClass => {
  @Extension(manifest)
  class TestExtension {}
  return TestExtension;
};

const frame: ScyllaModule = {
  id: 'frame',
  domain: {},
  mounts: { public: {}, app: { shell: true }, organization: { parent: 'app', path: ':slug' } },
  navSections: [{ id: 'main', title: msg`Main` }],
  access: policy,
  fallback: Fallback,
};

const agents: ScyllaModule = {
  id: 'agents',
  domain: { agentsRepository: {} },
  routes: {
    organization: [
      {
        path: 'agents',
        page,
        permission: testPermission('LIST_AGENTS'),
        nav: { section: 'main', title: msg`Agents` },
      },
    ],
  },
};

const billing = (overrides: Partial<ScyllaModule> = {}): ScyllaModule => ({
  id: 'billing',
  domain: { billingRepository: {} },
  routes: {
    organization: [{ path: 'billing', page, nav: { section: 'main', title: msg`Billing` } }],
  },
  ...overrides,
});

const Base = extension({ id: 'base', name: 'Base', version: '1.0.0', modules: [frame, agents] });

const addOn = (modules: ScyllaModule[] = [billing()], overrides: Partial<ExtensionManifest> = {}) =>
  extension({
    id: 'add-on',
    name: 'Add-on',
    version: '1.0.0',
    dependencies: ['base'],
    modules,
    ...overrides,
  });

describe('loadExtensions', () => {
  it('reads the manifest that @Extension puts on a class', () => {
    expect(loadExtensions([Base]).extensions.map(e => e.name)).toEqual(['Base']);
  });

  it('refuses a class without @Extension', () => {
    class Plain {}

    expect(() => loadExtensions([Plain])).toThrow(/Plain has no @Extension decorator/);
  });

  it('loads an extension after the extensions it depends on, whatever the list order', () => {
    const app = loadExtensions([addOn(), Base]);

    expect(app.extensions.map(e => e.id)).toEqual(['base', 'add-on']);
  });

  it("grafts the routes and links of one extension's modules on another's mounts", () => {
    const app = loadExtensions([Base, addOn()]);

    expect(app.shell.entries.map(entry => entry.pattern.join('/'))).toEqual([
      ':slug/agents',
      ':slug/billing',
    ]);
  });

  it('registers the domain of every module of every extension, by module id', () => {
    const app = loadExtensions([Base, addOn()]);

    expect(Object.keys(app.dependencies)).toEqual(['frame', 'agents', 'billing']);
  });

  it("gives the router the access policy's guard and the fallback page", () => {
    const app = loadExtensions([Base]);

    expect(app.router.guard).toBe(policy.guard);
    expect(app.router.fallback).toBe(Fallback);
    expect(app.shell.access).toBe(policy);
  });

  it('collects the shell parts and error handlers of the modules, and the catalogs', () => {
    const onQueryError = () => {};
    const onQueryRetry = () => undefined;
    const catalogs = {};
    const app = loadExtensions([
      Base,
      addOn([billing({ shell: { overlays: [] }, onQueryError, onQueryRetry })], { catalogs }),
    ]);

    expect(app.shell.contributions).toEqual([{ overlays: [] }]);
    expect(app.queryErrorHandlers).toEqual([onQueryError]);
    expect(app.queryRetryPolicies).toEqual([onQueryRetry]);
    expect(app.catalogs).toEqual([catalogs]);
  });

  it('refuses a dependency that is not loaded', () => {
    expect(() => loadExtensions([addOn()])).toThrow(
      /"add-on" depends on "base", which is not loaded/,
    );
  });

  it('refuses extensions that depend on each other', () => {
    const first = addOn([], { id: 'first', dependencies: ['second'] });
    const second = addOn([], { id: 'second', dependencies: ['first'] });

    expect(() => loadExtensions([Base, first, second])).toThrow(
      /depend on each other: first -> second -> first/,
    );
  });

  it('refuses two extensions with one id', () => {
    expect(() => loadExtensions([Base, Base])).toThrow(/Two extensions have the id "base"/);
  });

  it('refuses two modules with one id, which would share one DI entry', () => {
    expect(() => loadExtensions([Base, addOn([billing({ id: 'agents' })])])).toThrow(
      /Two modules have the id "agents"/,
    );
  });

  it('refuses a mount that two modules declare', () => {
    expect(() => loadExtensions([Base, addOn([billing({ mounts: { app: {} } })])])).toThrow(
      /Two mounts have the id "app"/,
    );
  });

  it('refuses a second access policy or a second fallback page', () => {
    expect(() => loadExtensions([Base, addOn([billing({ access: policy })])])).toThrow(
      /Only one module may give an access policy: frame, billing/,
    );
    expect(() => loadExtensions([Base, addOn([billing({ fallback: Fallback })])])).toThrow(
      /Only one module may give the fallback page/,
    );
  });

  it('refuses an app without a fallback page', () => {
    const bare = extension({ id: 'bare', name: 'Bare', version: '1.0.0', modules: [] });

    expect(() => loadExtensions([bare])).toThrow(/No module gives the fallback page/);
  });

  it('refuses a sidebar link to a section that no module declares', () => {
    const lost = billing({
      routes: {
        organization: [{ path: 'billing', page, nav: { section: 'money', title: msg`Billing` } }],
      },
    });

    expect(() => loadExtensions([Base, addOn([lost])])).toThrow(
      /"billing" names the nav section "money", which no module declares/,
    );
  });
});
