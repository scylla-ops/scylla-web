import { Extension } from '@scylla/core-sdk';
import type { CatalogModule } from '@scylla/ui/i18n';
import { CloudAuthModule } from './features/auth/auth.module.ts';
import { EmailLoginWidgetInjection } from './features/auth/widget-injections/email-login/email-login.widget-injection.ts';
import { SignUpLinkWidgetInjection } from './features/auth/widget-injections/sign-up-link/sign-up-link.widget-injection.ts';

@Extension({
  id: 'scylla-cloud',
  name: 'Scylla Cloud',
  version: '0.1.0',
  dependencies: ['scylla-base'],
  modules: [CloudAuthModule],
  widgetInjections: { EmailLoginWidgetInjection, SignUpLinkWidgetInjection },
  catalogs: import.meta.glob<CatalogModule>('./**/locales/*/messages.ts'),
})
export class ScyllaCloudExtension {}
