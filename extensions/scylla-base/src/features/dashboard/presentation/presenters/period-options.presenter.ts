import type { MessageDescriptor } from '@lingui/core';
import type { SegmentedOption } from '@scylla/ui';
import { t } from '@scylla/ui/i18n';
import { formatUtcDay } from '@shared/utils/date-utils.ts';
import { dashboardMessages } from '@base/features/dashboard/presentation/messages/dashboard.messages.ts';
import {
  PERIOD_KINDS,
  type CustomPeriodIssue,
  type PeriodKind,
} from '@base/features/dashboard/presentation/presenters/period.presenter.ts';
import type { Day } from '@base/features/dashboard/presentation/presenters/zoned-day.presenter.ts';

const LABELS: Readonly<Record<PeriodKind, MessageDescriptor>> = {
  '24h': dashboardMessages.last24Hours,
  '7d': dashboardMessages.last7Days,
  '14d': dashboardMessages.last14Days,
  '30d': dashboardMessages.last30Days,
  custom: dashboardMessages.customPeriod,
};

const ISSUES: Readonly<Record<Exclude<CustomPeriodIssue, 'incomplete'>, MessageDescriptor>> = {
  'start-after-end': dashboardMessages.startAfterEnd,
  'end-in-future': dashboardMessages.endInFuture,
  'too-long': dashboardMessages.tooLong,
};

/** The segments of the period picker, in the order of the design. */
export const periodOptions = (): SegmentedOption<PeriodKind>[] =>
  PERIOD_KINDS.map(kind => ({ value: kind, label: t(LABELS[kind]) }));

/** The days of a custom period, with no year: "2 Nov – 15 Nov", or "12 Nov" for one day. */
export const customPeriodLabel = (from: Day, to: Day): string =>
  from === to ? formatUtcDay(from) : `${formatUtcDay(from)} – ${formatUtcDay(to)}`;

/** The text under the form. An incomplete period has none: Apply stays off. */
export const customPeriodIssueText = (issue: CustomPeriodIssue | null): string | null =>
  issue && issue !== 'incomplete' ? t(ISSUES[issue]) : null;
