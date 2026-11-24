import type { ScyllaModule } from '@scylla/core-sdk';
import { msg } from '@lingui/core/macro';
import ScaleIcon from '@lucide/svelte/icons/scale';
import { Permission } from '@platform/authz';
import { trackersPoints } from '@platform/trackers';

export const LegalModule = {
  id: 'legal',
  // The legal settings are a capability of `platform/legal`: the shell and the sign-in pages read
  // them too.
  domain: {},
  routes: {
    public: [
      {
        // The path of the links of the footer, of the user menu and of the mails of the server: keep it.
        path: 'legal/:kind',
        page: () => import('./presentation/ui/LegalDocument/LegalDocument.page.svelte'),
      },
    ],
    admin: [
      {
        permission: Permission.MANAGE_INSTANCE_SETTINGS,
        path: 'legal',
        breadcrumb: () => ({ label: msg`Legal and privacy` }),
        page: () => import('./presentation/ui/LegalSettings/LegalSettings.page.svelte'),
        nav: { section: 'instance', title: msg`Legal and privacy`, icon: ScaleIcon, order: 55 },
      },
    ],
  },
  points: trackersPoints,
} satisfies ScyllaModule;
