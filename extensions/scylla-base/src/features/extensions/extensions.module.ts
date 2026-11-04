import { installedExtensions, type ScyllaModule } from '@scylla/core-sdk';
import { msg } from '@lingui/core/macro';
import PuzzleIcon from '@lucide/svelte/icons/puzzle';
import { DefaultExtensionRepository } from '@base/features/extensions/infrastructure/default-extension.repository.ts';
import { Permission } from '@platform/authz';

const extensionRepository = new DefaultExtensionRepository(installedExtensions);

export const ExtensionsModule = {
  id: 'extensions',
  domain: { extensionRepository },
  routes: {
    instance: [
      {
        permission: Permission.MANAGE_ROLES,
        path: 'extensions',
        breadcrumb: () => ({ label: msg`Extensions` }),
        page: () => import('./presentation/ui/Extensions/Extensions.page.svelte'),
        nav: { section: 'instance', title: msg`Extensions`, icon: PuzzleIcon, order: 40 },
      },
    ],
  },
} satisfies ScyllaModule;
