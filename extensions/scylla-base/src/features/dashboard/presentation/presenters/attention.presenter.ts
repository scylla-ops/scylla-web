import type { MessageDescriptor } from '@lingui/core';
import type { ChartTone } from '@scylla/ui';
import { t } from '@scylla/ui/i18n';
import { getRelativeTime } from '@shared/utils/date-utils.ts';
import type {
  AttentionItem,
  AttentionKind,
} from '@base/features/dashboard/domain/structs/attention.struct.ts';
import { attentionMessages as m } from '@base/features/dashboard/presentation/messages/attention.messages.ts';
import { linkMessages } from '@base/features/dashboard/presentation/messages/links.messages.ts';
import { viewMessages } from '@base/features/dashboard/presentation/messages/widgets-view.messages.ts';
import { shortJobId } from '@base/features/dashboard/presentation/presenters/job-figures.presenter.ts';
import { clockIn } from '@base/features/dashboard/presentation/presenters/zoned-day.presenter.ts';

/** The kinds in the order of the counts and the legend. */
export const ATTENTION_ORDER: readonly AttentionKind[] = [
  'job-failed',
  'fire-failed',
  'job-orphaned',
  'fire-missed',
  'agent-offline',
  'approval-waiting',
];

export const ATTENTION_TONES: Readonly<Record<AttentionKind, ChartTone>> = {
  'job-failed': 'failed',
  'fire-failed': 'warning',
  'job-orphaned': 'canceled',
  'fire-missed': 'skipped',
  'agent-offline': 'queued',
  'approval-waiting': 'info',
};

const LABELS: Readonly<Record<AttentionKind, MessageDescriptor>> = {
  'job-failed': m.failed,
  'fire-failed': m.fireFailed,
  'job-orphaned': m.orphaned,
  'fire-missed': m.timeMissed,
  'agent-offline': m.agentOffline,
  'approval-waiting': m.approval,
};

/** "failed", "fire failed", "time missed". */
export const attentionLabel = (kind: AttentionKind): string => t(LABELS[kind]);

/** The name of the row: the agent for an agent, else the pipeline. */
export const attentionTitle = (item: AttentionItem): string => item.agent?.name || item.pipelineName;

/** What a click on the name of an item opens: its job, the triggers, or the agent. */
export const attentionOpens = (item: AttentionItem): string =>
  t(item.job ? linkMessages.openJob : item.fire ? linkMessages.openTriggers : linkMessages.openAgent);

/** The last 8 characters of the job id, or nothing. */
export const attentionJob = (item: AttentionItem): string => (item.job ? shortJobId(item.job.id) : '');

/** The error of the job or of the fire. */
export const attentionError = (item: AttentionItem): string => {
  if (item.job) return item.job.nodeError || item.job.error;
  if (item.fire) return item.fire.error || t(viewMessages.fireOf(item.fire.triggerName));
  return item.agent ? t(viewMessages.agentAway) : '';
};

const isFire = (item: AttentionItem) => item.kind === 'fire-failed' || item.kind === 'fire-missed';

/** "18 min", "1 h 50", "2 h": the time since the item, short. */
export const shortAgo = (at: string, now: number = Date.now()): string => {
  const minutes = Math.max(0, Math.floor((now - Date.parse(at)) / 60_000));
  if (minutes < 60) return t(m.minutes(minutes));
  const hours = Math.floor(minutes / 60);
  if (hours >= 24) return t(m.days(Math.floor(hours / 24)));
  const rest = minutes % 60;
  return rest ? t(m.hoursMinutes(hours, rest)) : t(m.hours(hours));
};

/** The time of the item: the clock of a fire, else the time since it. */
export const attentionWhen = (item: AttentionItem, timeZone: string, short: boolean): string => {
  if (isFire(item)) return clockIn(new Date(item.at), timeZone);
  return short ? shortAgo(item.at) : getRelativeTime(item.at);
};

/** The open count of each kind, in the order of the legend, without the empty kinds. */
export const attentionCounts = (
  counts: readonly { kind: AttentionKind; open: number }[],
): { kind: AttentionKind; open: number }[] =>
  ATTENTION_ORDER.map(kind => ({ kind, open: counts.find(item => item.kind === kind)?.open ?? 0 })).filter(
    item => item.open > 0,
  );
