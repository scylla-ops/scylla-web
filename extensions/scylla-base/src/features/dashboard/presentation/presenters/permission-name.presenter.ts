import { t } from '@scylla/ui/i18n';
import { actionLabels, areaLabels } from '@base/features/roles';

/** The areas whose read permission a widget needs. */
export type WidgetArea = 'jobs' | 'pipelines' | 'agents' | 'triggers' | 'integrations';

/** "Agents · View": the name of the read permission of an area, as the role editor shows it. */
export const viewPermissionName = (area: WidgetArea): string =>
  `${t(areaLabels[area].title)} · ${t(actionLabels.view)}`;
