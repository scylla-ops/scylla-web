import { t } from '@scylla/ui/i18n';
import { actionLabels, areaLabels } from '@base/features/roles';

export type WidgetArea = 'jobs' | 'pipelines' | 'agents' | 'triggers' | 'integrations';

export const viewPermissionName = (area: WidgetArea): string =>
  `${t(areaLabels[area].title)} · ${t(actionLabels.view)}`;
