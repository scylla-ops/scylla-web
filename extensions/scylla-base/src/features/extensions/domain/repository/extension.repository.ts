import type { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { InstalledExtension } from '@base/features/extensions/domain/structs/installed-extension.struct.ts';

export interface ExtensionRepository {
  /** In load order: an extension comes after the extensions it depends on. */
  getInstalledExtensions(): Promise<ScyllaResult<InstalledExtension[]>>;
}
