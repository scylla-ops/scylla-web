import type { ExtensionClass } from '@scylla/core-sdk';
import { ScyllaBaseExtension } from '@scylla/base';
import { ScyllaCloudExtension } from '@scylla/cloud';

/** The extensions of this build. The core loads an extension after the ones it depends on. */
export const extensions: readonly ExtensionClass[] = [ScyllaBaseExtension, ScyllaCloudExtension];
