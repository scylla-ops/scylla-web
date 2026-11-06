import { i18n, type Messages } from '@lingui/core';

export type SupportedLocale = 'en' | 'fr';

const STORAGE_KEY = 'scylla-locale';

/**
 * The compiled catalogs of a package, by path: the result of
 * `import.meta.glob('./**\/locales/*\/messages.ts')`. Lazy: only the active locale is loaded.
 */
export type CatalogLoaders = Readonly<Record<string, () => Promise<CatalogModule>>>;

export interface CatalogModule {
  messages: Messages;
}

const sources: CatalogLoaders[] = [import.meta.glob<CatalogModule>('../locales/*/messages.ts')];

const LOCALE_FROM_PATH = /\/locales\/([^/]+)\/messages\.ts$/;

const loadedLocales = new Set<SupportedLocale>();

/** Call it before `initializeAppLocale`, once per package that has messages. */
export function registerCatalogs(loaders: CatalogLoaders): void {
  sources.push(loaders);
  loadedLocales.clear();
}

/** The messages of all catalogs of a locale. It does not activate them. */
export async function readCatalogs(locale: SupportedLocale): Promise<Messages> {
  const modules = await Promise.all(
    sources
      .flatMap(loaders => Object.entries(loaders))
      .filter(([path]) => LOCALE_FROM_PATH.exec(path)?.[1] === locale)
      .map(([, load]) => load()),
  );
  return modules.reduce<Messages>((all, module) => Object.assign(all, module.messages), {});
}

/** The plain text of a message in a catalog that `readCatalogs` gave. */
export function plainMessage(catalog: Messages, id: string | undefined): string | undefined {
  const message = id ? catalog[id] : undefined;
  if (message === undefined) return undefined;
  return typeof message === 'string'
    ? message
    : message.filter(part => typeof part === 'string').join('');
}

async function loadCatalogs(locale: SupportedLocale): Promise<void> {
  if (loadedLocales.has(locale)) return;

  i18n.load(locale, await readCatalogs(locale));
  loadedLocales.add(locale);
}

function isSupportedLocale(locale: string | null | undefined): locale is SupportedLocale {
  return locale === 'en' || locale === 'fr';
}

export function getStoredLocale(): SupportedLocale {
  if (typeof window === 'undefined') {
    return 'en';
  }

  const storedLocale = window.localStorage.getItem(STORAGE_KEY);
  if (isSupportedLocale(storedLocale)) {
    return storedLocale;
  }

  const browserLocale = window.navigator.language.split('-')[0];
  return browserLocale === 'fr' ? 'fr' : 'en';
}

export async function setAppLocale(locale: SupportedLocale): Promise<void> {
  await loadCatalogs(locale);
  i18n.activate(locale);

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }
}

/** Awaited before the first render, so no frame shows untranslated text. */
export async function initializeAppLocale(): Promise<SupportedLocale> {
  const locale = getStoredLocale();
  await setAppLocale(locale);
  return locale;
}

export function getCurrentLocale(): SupportedLocale {
  return (i18n.locale as SupportedLocale | undefined) ?? 'en';
}
