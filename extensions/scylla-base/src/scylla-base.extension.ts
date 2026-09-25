import { Extension } from '@scylla/core-sdk';
import type { CatalogModule } from '@scylla/ui/i18n';
import { ShellModule } from './shell/shell.module.ts';
import { modules } from './shell/modules.ts';

/** The Scylla product. A new feature is one more module in `shell/modules.ts`. */
@Extension({
  id: 'scylla-base',
  name: 'Scylla',
  version: '0.4.0',
  modules: [ShellModule, ...modules],
  catalogs: import.meta.glob<CatalogModule>('./**/locales/*/messages.ts'),
})
export class ScyllaBaseExtension {}
