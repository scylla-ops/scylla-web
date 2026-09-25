import { installedExtensions, type ScyllaModule } from '@scylla/core-sdk';
import { msg } from '@lingui/core/macro';
import PuzzleIcon from '@lucide/svelte/icons/puzzle';
import { DefaultExtensionRepository } from '@base/features/extensions/infrastructure/repository/default-extension.repository.ts';

const extensionRepository = new DefaultExtensionRepository(installedExtensions);

export const ExtensionsModule = {
  id: 'extensions',
  domain: { extensionRepository },
  routes: {
    organization: [
      {
        path: 'extensions',
        breadcrumb: () => ({ label: msg`Extensions` }),
        page: () => import('./presentation/ui/Extensions/Extensions.page.svelte'),
        nav: { section: 'system', title: msg`Extensions`, icon: PuzzleIcon, order: 30 },
      },
    ],
  },
} satisfies ScyllaModule;
