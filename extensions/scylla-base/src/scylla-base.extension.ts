import { Extension } from '@scylla/core-sdk';
import type { CatalogModule } from '@scylla/ui/i18n';
import { ShellModule } from './shell/shell.module.ts';
import { modules } from './shell/modules.ts';
import { PipelineTriggersWidgetInjection } from './features/triggers/widget-injections/pipeline-triggers/pipeline-triggers.widget-injection.ts';

/** The Scylla product. A new feature is one more module in `shell/modules.ts`. */
@Extension({
  id: 'scylla-base',
  name: 'Scylla',
  version: '0.7.1',
  modules: [ShellModule, ...modules],
  widgetInjections: { PipelineTriggersWidgetInjection },
  catalogs: import.meta.glob<CatalogModule>('./**/locales/*/messages.ts'),
})
export class ScyllaBaseExtension {}
