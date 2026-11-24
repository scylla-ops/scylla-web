import { mount } from 'svelte';
import {
  setAppNavigator,
  setDependencyRegistry,
  setInstalledExtensions,
  setNavLinks,
  setQueryClient,
  setWidgetInjectionRegistry,
  type ExtensionClass,
} from '@scylla/core-sdk';
import { initializeAppLocale, registerCatalogs, type CatalogModule } from '@scylla/ui/i18n';
import App from './App.svelte';
import { loadExtensions } from './loader/load-extensions.ts';
import { createAppQueryClient } from './query/query-client.ts';
import { createAppRouter } from './routing/runtime/app-router.ts';
import { navLinksFor } from './shell/nav-links.ts';
import { setShellConfig } from './shell/shell-config.ts';

export interface StartOptions {
  /** The classes that carry `@Extension`. */
  extensions: readonly ExtensionClass[];
  target: HTMLElement;
}

/** Loads the extensions, installs the app-wide state, and mounts the app. Call it once. */
export const startCore = async ({ extensions, target }: StartOptions): Promise<void> => {
  const app = loadExtensions(extensions);

  registerCatalogs(import.meta.glob<CatalogModule>('./locales/*/messages.ts'));
  app.catalogs.forEach(registerCatalogs);
  setDependencyRegistry(app.dependencies);
  setWidgetInjectionRegistry(app.widgetInjections);
  setInstalledExtensions(app.extensions);
  const queryClient = createAppQueryClient(app.queryErrorHandlers, app.queryRetryPolicies);
  // The refetch on focus and on reconnect starts here. No `QueryClientProvider` does it.
  queryClient.mount();
  setQueryClient(queryClient);
  setShellConfig(app.shell);
  setNavLinks(navLinksFor(app.shell));

  // Before the first render, so no frame shows untranslated text.
  await initializeAppLocale();

  setAppNavigator(createAppRouter(app.router));
  mount(App, { target });
};
