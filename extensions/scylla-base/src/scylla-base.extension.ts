import { Extension } from '@scylla/core-sdk';
import type { CatalogModule } from '@scylla/ui/i18n';
import { ShellModule } from './shell/shell.module.ts';
import { modules } from './shell/modules.ts';
import { PipelineTriggersWidgetInjection } from './features/triggers/widget-injections/pipeline-triggers/pipeline-triggers.widget-injection.ts';
import { ProjectCardPipelinesWidgetInjection } from './features/pipeline/widget-injections/project-card/project-card.widget-injection.ts';
import { ProjectCardRepositoryWidgetInjection } from './features/integrations/widget-injections/project-card/project-card.widget-injection.ts';

/** The Scylla product. A new feature is one more module in `shell/modules.ts`. */
@Extension({
  id: 'scylla-base',
  name: 'Scylla',
  version: '0.7.2',
  modules: [ShellModule, ...modules],
  widgetInjections: {
    PipelineTriggersWidgetInjection,
    ProjectCardPipelinesWidgetInjection,
    ProjectCardRepositoryWidgetInjection,
  },
  catalogs: import.meta.glob<CatalogModule>('./**/locales/*/messages.ts'),
})
export class ScyllaBaseExtension {}
