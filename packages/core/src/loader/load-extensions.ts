import type { Component } from 'svelte';
import {
  extensionOf,
  type AccessPolicy,
  type DomainRegistry,
  type ExtensionClass,
  type ExtensionManifest,
  type MountDefinition,
  type QueryErrorHandler,
  type QueryRetryPolicy,
  type RouteMount,
  type ScyllaModule,
} from '@scylla/core-sdk';
import type { CatalogLoaders } from '@scylla/ui/i18n';
import { mountPath, type AppRouterConfig } from '../routing/compilation/compile-routes.ts';
import { navEntriesFor } from '../routing/compilation/nav-entries.ts';
import type { ShellConfig } from '../shell/shell-config.ts';
import ShellFrame from '../shell/ShellFrame/ShellFrame.svelte';

/** The application that the extensions make together. */
export interface LoadedApp {
  /** In load order: an extension comes after the extensions it depends on. */
  extensions: readonly ExtensionManifest[];
  router: AppRouterConfig;
  shell: ShellConfig;
  dependencies: DomainRegistry;
  catalogs: readonly CatalogLoaders[];
  queryErrorHandlers: readonly QueryErrorHandler[];
  queryRetryPolicies: readonly QueryRetryPolicy[];
}

const uniqueBy = <T>(items: readonly T[], keyOf: (item: T) => string, what: string): void => {
  const seen = new Set<string>();
  for (const item of items) {
    const key = keyOf(item);
    if (seen.has(key)) throw new Error(`Two ${what}s have the id "${key}".`);
    seen.add(key);
  }
};

/** Depth-first: the dependencies of an extension come before it, and the list order is kept otherwise. */
const inLoadOrder = (extensions: readonly ExtensionManifest[]): ExtensionManifest[] => {
  const byId = new Map(extensions.map(extension => [extension.id, extension]));
  const ordered: ExtensionManifest[] = [];
  const state = new Map<string, 'visiting' | 'done'>();

  const visit = (extension: ExtensionManifest, path: readonly string[]): void => {
    if (state.get(extension.id) === 'done') return;
    if (state.get(extension.id) === 'visiting') {
      throw new Error(
        `The extensions depend on each other: ${[...path, extension.id].join(' -> ')}.`,
      );
    }

    state.set(extension.id, 'visiting');
    for (const id of extension.dependencies ?? []) {
      const dependency = byId.get(id);
      if (!dependency) {
        throw new Error(`The extension "${extension.id}" depends on "${id}", which is not loaded.`);
      }
      visit(dependency, [...path, extension.id]);
    }
    state.set(extension.id, 'done');
    ordered.push(extension);
  };

  extensions.forEach(extension => visit(extension, []));
  return ordered;
};

const onlyOne = <T>(
  modules: readonly ScyllaModule[],
  pick: (module: ScyllaModule) => T | undefined,
  what: string,
): T | undefined => {
  const providers = modules.filter(module => pick(module) !== undefined);
  if (providers.length > 1) {
    throw new Error(`Only one module may give ${what}: ${providers.map(m => m.id).join(', ')}.`);
  }
  return providers[0] ? pick(providers[0]) : undefined;
};

/**
 * Reads the `@Extension` of each class, checks them, and merges what their
 * modules declare into one application: the routes, the shell, the DI registry
 * and the catalogs.
 *
 * It throws on a declaration that cannot work, so a mistake fails at start-up
 * and in the tests rather than on the page.
 */
export const loadExtensions = (classes: readonly ExtensionClass[]): LoadedApp => {
  const list = classes.map(extensionOf);
  uniqueBy(list, extension => extension.id, 'extension');
  const extensions = inLoadOrder(list);

  const modules = extensions.flatMap(extension => extension.modules);
  uniqueBy(modules, module => module.id, 'module');

  const mountList = modules.flatMap(module => Object.entries(module.mounts ?? {}));
  uniqueBy(mountList, ([id]) => id, 'mount');
  const mounts: Record<RouteMount, MountDefinition> = Object.fromEntries(mountList);

  const sections = modules.flatMap(module => module.navSections ?? []);
  uniqueBy(sections, section => section.id, 'nav section');

  const access = onlyOne<AccessPolicy>(modules, module => module.access, 'an access policy');
  const fallback = onlyOne<Component>(modules, module => module.fallback, 'the fallback page');
  if (!fallback) throw new Error('No module gives the fallback page.');

  const entries = navEntriesFor(modules, mount => mountPath(mount, mounts));
  const lost = entries.find(entry => !sections.some(section => section.id === entry.section));
  if (lost) {
    throw new Error(
      `The sidebar link "${lost.url}" names the nav section "${lost.section}", which no module declares.`,
    );
  }

  return {
    extensions,
    router: { mounts, modules, fallback, shell: ShellFrame, guard: access?.guard },
    shell: {
      entries,
      sections,
      access,
      contributions: modules.flatMap(module => module.shell ?? []),
    },
    dependencies: Object.fromEntries(modules.map(module => [module.id, module.domain])),
    catalogs: extensions.flatMap(extension => (extension.catalogs ? [extension.catalogs] : [])),
    queryErrorHandlers: modules.flatMap(module => module.onQueryError ?? []),
    queryRetryPolicies: modules.flatMap(module => module.onQueryRetry ?? []),
  };
};
