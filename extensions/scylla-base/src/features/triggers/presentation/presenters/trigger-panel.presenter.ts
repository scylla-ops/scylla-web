import type { StatusState } from '@scylla/ui';
import { intlLocale, t } from '@scylla/ui/i18n';
import type { RepositoryLink, VcsProvider } from '@base/features/integrations';
import { formatDate, getRelativeTime } from '@shared/utils/date-utils.ts';
import {
  GIT_KINDS,
  type TriggerDraftKind,
  type TriggerEntity,
} from '@base/features/triggers/domain/entities/trigger.entity.ts';
import { parseCron } from '@base/features/triggers/presentation/mappers/cron.mapper.ts';
import { convertCronToLocal } from '@base/features/triggers/presentation/mappers/cron-timezone.mapper.ts';
import { triggerPanelMessages } from '@base/features/triggers/presentation/messages/trigger-panel.messages.ts';
import { triggersMessages } from '@base/features/triggers/presentation/messages/triggers.messages.ts';
import { describeCron } from './cron.presenter.ts';
import { gitKindLabel, gitSourceSummary } from './trigger-source.presenter.ts';

/** The triggers of the `on` table of a pipeline file, apart from the ones that Scylla keeps. */
export const triggerGroups = (triggers: readonly TriggerEntity[]) => ({
  fromFile: triggers.filter(trigger => trigger.fromFile),
  stored: triggers.filter(trigger => !trigger.fromFile),
});

/** What starts a run, in one line: "Every day at 09:00", "Push · main", "Webhook · 2 conditions". */
export const triggerSummary = (trigger: TriggerEntity, provider?: VcsProvider): string => {
  const { source } = trigger;
  switch (source.kind) {
    case 'cron': {
      const local = convertCronToLocal(source.expression);
      const model = parseCron(local);
      return model.frequency === 'custom' ? local : describeCron(model);
    }
    case 'webhook': {
      const kind = t(triggersMessages.kindWebhook);
      const count = source.conditions.length;
      return count > 0 ? `${kind} · ${t(triggersMessages.conditionCount(count))}` : kind;
    }
    case 'unknown':
      return t(triggersMessages.unknown);
    default:
      return `${gitKindLabel(source.kind, provider)} · ${gitSourceSummary(source)}`;
  }
};

export interface LastRun {
  state: StatusState;
  /** The result, for a screen reader: the shape has no text. */
  result: string;
  /** "Last run 2 hr. ago". */
  text: string;
  /** The full date, and why a fire failed or was skipped. */
  title: string;
}

/** The last fire of a trigger. `null`: it never fired. */
export const lastRun = (trigger: TriggerEntity): LastRun | null => {
  if (!trigger.lastFiredAt) return null;
  const outcome = trigger.lastResult;
  const date = formatDate(trigger.lastFiredAt);
  const text = t(triggerPanelMessages.lastRun(getRelativeTime(trigger.lastFiredAt)));
  switch (outcome?.kind) {
    case 'succeeded':
      return { state: 'success', result: t(triggersMessages.ok), text, title: date };
    case 'failed':
      return {
        state: 'failed',
        result: t(triggersMessages.error),
        text,
        title: `${date} · ${outcome.error}`,
      };
    case 'skipped':
      return {
        state: 'skipped',
        result: t(triggersMessages.skipped),
        text,
        title: `${date} · ${outcome.reason}`,
      };
    default:
      // An outcome newer than this build, or none: do not claim a success.
      return { state: 'idle', result: t(triggersMessages.unknown), text, title: date };
  }
};

const shortDateTime = (iso: string): string =>
  new Intl.DateTimeFormat(intlLocale(), { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );

/** When the trigger starts its next run, or why it starts none. `null`: nothing to tell. */
export const nextRun = (trigger: TriggerEntity): string | null => {
  if (trigger.fromFile) return null;
  if (!trigger.enabled) {
    return trigger.source.kind === 'webhook'
      ? t(triggerPanelMessages.stoppedWebhook)
      : t(triggerPanelMessages.stopped);
  }
  return trigger.source.kind === 'cron' && trigger.nextFireAt
    ? t(triggerPanelMessages.nextRun(shortDateTime(trigger.nextFireAt)))
    : null;
};

/**
 * The kinds that "Add trigger" offers. The `on` table of its file gives the Git triggers of a file
 * pipeline, and a Git kind needs a linked repository: only a known absent link (`null`) removes
 * them, as in the full editor.
 */
export const addableKinds = (
  isFile: boolean,
  link: RepositoryLink | null | undefined,
): TriggerDraftKind[] =>
  isFile || link === null ? ['cron', 'webhook'] : ['cron', 'webhook', ...GIT_KINDS];

/** The first name that no trigger of the pipeline has: "Schedule", then "Schedule 2", and so on. */
export const freeTriggerName = (base: string, triggers: readonly TriggerEntity[]): string => {
  const taken = triggers.map(trigger => trigger.name);
  if (!taken.includes(base)) return base;
  let index = 2;
  while (taken.includes(`${base} ${index}`)) index += 1;
  return `${base} ${index}`;
};
