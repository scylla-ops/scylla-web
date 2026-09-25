import type { ExtensionManifest, ModuleRoute } from '@scylla/core-sdk';
import { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { ExtensionRepository } from '@base/features/extensions/domain/repository/extension.repository.ts';
import type { InstalledExtension } from '@base/features/extensions/domain/structs/installed-extension.struct.ts';

const countPages = (routes: readonly ModuleRoute[]): number =>
  routes.reduce(
    (count, route) => count + (route.page ? 1 : 0) + countPages(route.children ?? []),
    0,
  );

const toInstalledExtension = (manifest: ExtensionManifest): InstalledExtension => ({
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

  getInstalledExtensions(): Promise<ScyllaResult<InstalledExtension[]>> {
    return Promise.resolve(
      ScyllaResult.try(
        () => this.installed().map(toInstalledExtension),
        'Failed to read the installed extensions.',
      ),
    );
  }
}
