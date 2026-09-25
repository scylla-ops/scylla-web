import type { ExtensionManifest } from './extension.decorator.ts';

let installed: readonly ExtensionManifest[] = [];

/** Called once by the core at start-up, with the extensions in load order. */
export const setInstalledExtensions = (extensions: readonly ExtensionManifest[]): void => {
  installed = extensions;
};

/** The extensions the app runs, in load order. Empty until the core is started. */
export const installedExtensions = (): readonly ExtensionManifest[] => installed;
