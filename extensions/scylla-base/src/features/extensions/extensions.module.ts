import { installedExtensions, type ScyllaModule } from '@scylla/core-sdk';
import { msg } from '@lingui/core/macro';
import PuzzleIcon from '@lucide/svelte/icons/puzzle';
import { DefaultExtensionRepository } from '@base/features/extensions/infrastructure/default-extension.repository.ts';
import { Permission } from '@platform/authz';
import { ADMIN_NAV_HEADINGS } from '@shared/presentation/admin-nav.ts';

const extensionRepository = new DefaultExtensionRepository(installedExtensions);

export const ExtensionsModule = {
  id: 'extensions',
  domain: { extensionRepository },
  routes: {
    admin: [
      {
        permission: Permission.MANAGE_ROLES,
        path: 'extensions',
        breadcrumb: () => ({ label: msg`Extensions` }),
        page: () => import('./presentation/ui/Extensions/Extensions.page.svelte'),
        nav: {
          section: 'instance',
          title: msg`Extensions`,
          keywords: msg`plugin`,
          icon: PuzzleIcon,
          order: 30,
          heading: ADMIN_NAV_HEADINGS.integrations,
        },
      },
    ],
  },
} satisfies ScyllaModule;
