import { t } from '@scylla/ui/i18n';
import { formatUtcDay } from '@shared/utils/date-utils.ts';
import type { Day, StatsPeriod } from '@base/features/apps/domain/structs/stats-period.struct.ts';
import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';

/** The days of a period for a title: "Oct 11 – Today", "Sep 9 – Sep 29". */
export const periodRange = (period: StatsPeriod, today: Day): string => {
  const to = period.to === today ? t(messages.today) : formatUtcDay(period.to);
  return period.from === period.to ? to : `${formatUtcDay(period.from)} – ${to}`;
};
