import type { ScyllaModule } from '@scylla/core-sdk';
import { msg } from '@lingui/core/macro';
import MailIcon from '@lucide/svelte/icons/mail';
import SettingsIcon from '@lucide/svelte/icons/settings';
import { Permission } from '@platform/authz';
import { grpcTransport } from '@platform/grpc';
import { ADMIN_NAV_HEADINGS } from '@shared/presentation/admin-nav.ts';
import { MailSettingsServiceClient } from '@base/generated/scylla/platform/v1/mail_settings_service.client.ts';
import { SettingsServiceClient } from '@base/generated/scylla/platform/v1/settings_service.client.ts';
import { DefaultInstanceSettingsRepository } from './infrastructure/default-instance-settings.repository.ts';
import { DefaultMailSettingsRepository } from './infrastructure/default-mail-settings.repository.ts';

const instanceSettingsRepository = new DefaultInstanceSettingsRepository(
  new SettingsServiceClient(grpcTransport.getTransport()),
);

const mailSettingsRepository = new DefaultMailSettingsRepository(
  new MailSettingsServiceClient(grpcTransport.getTransport()),
);

export const InstanceSettingsModule = {
  id: 'instance-settings',
  domain: { instanceSettingsRepository, mailSettingsRepository },
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
      {
        permission: Permission.MANAGE_INSTANCE_SETTINGS,
        path: 'mail',
        breadcrumb: () => ({ label: msg`Mail` }),
        page: () => import('./presentation/ui/MailSettings/MailSettings.page.svelte'),
        nav: { section: 'instance', title: msg`Mail`, icon: MailIcon, order: 52 },
      },
    ],
  },
} satisfies ScyllaModule;
