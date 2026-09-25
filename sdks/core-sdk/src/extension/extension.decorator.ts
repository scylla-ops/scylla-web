import type { CatalogLoaders } from '@scylla/ui/i18n';
import type { ScyllaModule } from '../routing/scylla-module.struct.ts';

/** What `@Extension` declares. */
export interface ExtensionManifest {
  /** Unique across the extensions. */
  readonly id: string;
  readonly name: string;
  readonly version: string;
  /** The ids of the extensions that must load before this one. */
  readonly dependencies?: readonly string[];
  /** Everything the extension adds: pages, sidebar links, mounts, shell parts. */
  readonly modules: readonly ScyllaModule[];
  /** `import.meta.glob('./**\/locales/*\/messages.ts')`. */
  readonly catalogs?: CatalogLoaders;
}

/** A class that carries `@Extension`. */
export type ExtensionClass = abstract new (...args: never[]) => unknown;

const MANIFEST = Symbol('scylla.extension');

/**
 * Declares an extension on a class:
 *
 *   @Extension({ id: 'scylla-cloud', name: 'Scylla Cloud', version: '1.0.0', modules: [BillingModule] })
 *   export class ScyllaCloudExtension {}
 *
 * The app then lists the class: `startCore({ extensions: [ScyllaCloudExtension] })`.
 */
export const Extension =
  (manifest: ExtensionManifest) =>
  <TClass extends ExtensionClass>(target: TClass, _context: ClassDecoratorContext<TClass>): void => {
    Object.defineProperty(target, MANIFEST, { value: manifest });
  };

export const extensionOf = (target: ExtensionClass): ExtensionManifest => {
  const manifest = (target as { [MANIFEST]?: ExtensionManifest })[MANIFEST];
  if (!manifest) throw new Error(`${target.name} has no @Extension decorator.`);
  return manifest;
};
