import type { ChartTone } from '@scylla/ui';
import { t } from '@scylla/ui/i18n';
import type { ActivityEvent } from '@base/features/dashboard/domain/structs/activity.struct.ts';
import { activityMessages as m } from '@base/features/dashboard/presentation/messages/activity.messages.ts';
import { shortJobId } from '@base/features/dashboard/presentation/presenters/job-figures.presenter.ts';
import { widgetMessages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';

const statusText = (status: string): string => {
  if (status === 'completed') return t(widgetMessages.oneCompleted);
  if (status === 'failed') return t(widgetMessages.oneFailed);
  if (status === 'cancelled') return t(widgetMessages.oneCancelled);
  if (status === 'orphaned') return t(widgetMessages.oneOrphaned);
  return status;
};

/** How a row starts: a status dot, the initial of a person, an agent or a connection. */
export type ActivityMark =
  | { kind: 'dot'; tone: ChartTone }
  | { kind: 'person'; initial: string }
  | { kind: 'agent'; online: boolean }
  | { kind: 'connection' };

export interface ActivityLine {
  id: string;
  mark: ActivityMark;
  /** The bold name at the start: the pipeline, the person, the agent or the connection. */
  title: string;
  /** The last 8 characters of a job id, in mono. */
  job: string;
  detail: string;
  at: string;
}

const JOB_TONES: Readonly<Record<string, ChartTone>> = {
  completed: 'passed',
  failed: 'failed',
  orphaned: 'canceled',
  cancelled: 'canceled',
};

const joined = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(' · ');

const person = (event: ActivityEvent): ActivityMark => ({
  kind: 'person',
  initial: (event.actorName || '?').charAt(0).toUpperCase(),
});

/** The line of an event. A kind that this build does not know shows its actor and its kind. */
export const activityLine = (event: ActivityEvent): ActivityLine => {
  const p = event.params;
  const base = { id: event.id, at: event.at, job: '' };
  const project = event.projectName;
  switch (event.kind) {
    case 'job.ended':
      return {
        ...base,
        mark: { kind: 'dot', tone: JOB_TONES[p.status] ?? 'muted' },
        title: p.pipeline || event.subjectId.slice(-8),
        job: shortJobId(event.subjectId),
        detail: joined(statusText(p.status), project, p.origin),
      };
    case 'trigger.fire_failed':
      return { ...base, mark: { kind: 'dot', tone: 'warning' }, title: p.pipeline || p.name, detail: joined(t(m.fireFailed), project, p.schedule) };
    case 'trigger.time_missed':
      return { ...base, mark: { kind: 'dot', tone: 'skipped' }, title: p.pipeline || p.name, detail: joined(t(m.timeMissed), project, p.schedule) };
    case 'trigger.created':
    case 'trigger.updated':
    case 'trigger.deleted':
    case 'trigger.enabled':
    case 'trigger.disabled': {
      const verbs = {
        'trigger.created': m.triggerCreated,
        'trigger.updated': m.triggerUpdated,
        'trigger.deleted': m.triggerDeleted,
        'trigger.enabled': m.triggerEnabled,
        'trigger.disabled': m.triggerDisabled,
      } as const;
      return { ...base, mark: person(event), title: event.actorName, detail: joined(t(verbs[event.kind](p.name)), project) };
    }
    case 'secret.created':
    case 'secret.updated':
    case 'secret.deleted': {
      const verbs = { 'secret.created': m.secretCreated, 'secret.updated': m.secretUpdated, 'secret.deleted': m.secretDeleted } as const;
      return { ...base, mark: person(event), title: event.actorName, detail: joined(t(verbs[event.kind](p.name)), project) };
    }
    case 'member.joined':
      return { ...base, mark: person(event), title: event.actorName, detail: joined(t(m.memberJoined), p.inviter ? t(m.invitedBy(p.inviter)) : undefined) };
    case 'member.role_granted':
    case 'member.role_revoked':
      return {
        ...base,
        mark: person(event),
        title: event.actorName,
        detail: t((event.kind === 'member.role_granted' ? m.roleGranted : m.roleRevoked)(p.role, p.name)),
      };
    case 'agent.connected':
      return {
        ...base,
        mark: { kind: 'agent', online: true },
        title: p.name,
        detail: joined(t(m.connected), p.slots ? t(m.slots(p.slots)) : undefined, p.added_by ? t(m.addedBy(p.added_by)) : undefined),
      };
    case 'agent.disconnected':
      return { ...base, mark: { kind: 'agent', online: false }, title: p.name, detail: t(m.disconnected) };
    case 'connection.connected':
    case 'connection.disconnected':
    case 'connection.broken':
    case 'connection.repositories_changed': {
      const title = joined(p.provider, p.account).replace(' · ', ' ');
      const detail =
        event.kind === 'connection.connected'
          ? t(m.connected)
          : event.kind === 'connection.disconnected'
            ? t(m.disconnected)
            : event.kind === 'connection.broken'
              ? t(m.broken(p.reason))
              : joined(
                  Number(p.added) > 0 ? t(m.repositoriesAdded(Number(p.added))) : undefined,
                  Number(p.removed) > 0 ? t(m.repositoriesRemoved(Number(p.removed))) : undefined,
                );
      return { ...base, mark: { kind: 'connection' }, title, detail: joined(detail, event.actorName ? t(m.byName(event.actorName)) : undefined) };
    }
    default:
      return { ...base, mark: person(event), title: event.actorName || event.area, detail: joined(event.kind, project) };
  }
};
