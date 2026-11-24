import type { ScyllaModule } from '@scylla/core-sdk';
import { msg } from '@lingui/core/macro';
import SettingsIcon from '@lucide/svelte/icons/settings';
import { Permission } from '@platform/authz';
import { grpcTransport } from '@platform/grpc';
import { ADMIN_NAV_HEADINGS } from '@shared/presentation/admin-nav.ts';
import { SettingsServiceClient } from '@base/generated/scylla/platform/v1/settings_service.client.ts';
import { DefaultInstanceSettingsRepository } from './infrastructure/default-instance-settings.repository.ts';

const instanceSettingsRepository = new DefaultInstanceSettingsRepository(
  new SettingsServiceClient(grpcTransport.getTransport()),
);

export const InstanceSettingsModule = {
  id: 'instance-settings',
  domain: { instanceSettingsRepository },
  routes: {
    admin: [
      {
        permission: Permission.MANAGE_INSTANCE_SETTINGS,
        path: 'settings',
        breadcrumb: () => ({ label: msg`Settings` }),
        page: () => import('./presentation/ui/InstanceSettings/InstanceSettings.page.svelte'),
        nav: {
          section: 'instance',
          title: msg`Settings`,
          icon: SettingsIcon,
          order: 50,
          heading: ADMIN_NAV_HEADINGS.server,
        },
      },
    ],
  },
} satisfies ScyllaModule;
