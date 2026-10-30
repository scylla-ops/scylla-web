import type { InstalledExtensionEntity } from '@base/features/extensions/domain/entities/installed-extension.entity.ts';

export interface ExtensionRepository {
  /** In load order: an extension comes after the extensions it depends on. */
  getInstalledExtensions(): Promise<InstalledExtensionEntity[]>;
}
