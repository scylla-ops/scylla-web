import { t } from '@scylla/ui/i18n';
import type { WidgetKind } from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';
import { widgetMessages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';

const TITLES = {
  'success-rate': widgetMessages.successRate,
  'run-duration': widgetMessages.runDuration,
  'right-now': widgetMessages.rightNow,
  'needs-you': widgetMessages.needsYou,
  pipelines: widgetMessages.pipelines,
  activity: widgetMessages.activity,
  'quick-actions': widgetMessages.quickActions,
} as const satisfies Record<WidgetKind, unknown>;

export const widgetTitle = (widget: WidgetKind): string => t(TITLES[widget]);
