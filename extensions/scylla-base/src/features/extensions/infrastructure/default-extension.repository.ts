import type { ExtensionManifest, ModuleRoute } from '@scylla/core-sdk';
import type { ExtensionRepository } from '@base/features/extensions/domain/repository/extension.repository.ts';
import type { InstalledExtensionEntity } from '@base/features/extensions/domain/entities/installed-extension.entity.ts';

const countPages = (routes: readonly ModuleRoute[]): number =>
  routes.reduce(
    (count, route) => count + (route.page ? 1 : 0) + countPages(route.children ?? []),
    0,
  );

const toInstalledExtension = (manifest: ExtensionManifest): InstalledExtensionEntity => ({
  id: manifest.id,
  name: manifest.name,
  version: manifest.version,
  dependencies: [...(manifest.dependencies ?? [])],
  moduleCount: manifest.modules.length,
  pageCount: manifest.modules.reduce(
    (count, module) => count + countPages(Object.values(module.routes ?? {}).flat()),
    0,
  ),
});

/** Reads the extensions that the core loaded. A backend will add the ones that can be installed. */
export class DefaultExtensionRepository implements ExtensionRepository {
  constructor(private readonly installed: () => readonly ExtensionManifest[]) {}

  getInstalledExtensions(): Promise<InstalledExtensionEntity[]> {
    return Promise.resolve(this.installed().map(toInstalledExtension));
  }
}
