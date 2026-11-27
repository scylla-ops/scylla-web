import type { MessageDescriptor } from '@lingui/core';
import CalendarClockIcon from '@lucide/svelte/icons/calendar-clock';
import CopyIcon from '@lucide/svelte/icons/copy';
import FileTextIcon from '@lucide/svelte/icons/file-text';
import GitCommitHorizontalIcon from '@lucide/svelte/icons/git-commit-horizontal';
import GitPullRequestIcon from '@lucide/svelte/icons/git-pull-request';
import LockIcon from '@lucide/svelte/icons/lock';
import PackageIcon from '@lucide/svelte/icons/package';
import PlayIcon from '@lucide/svelte/icons/play';
import PowerIcon from '@lucide/svelte/icons/power';
import PowerOffIcon from '@lucide/svelte/icons/power-off';
import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
import TagIcon from '@lucide/svelte/icons/tag';
import UserRoundIcon from '@lucide/svelte/icons/user-round';
import WebhookIcon from '@lucide/svelte/icons/webhook';
import ZapIcon from '@lucide/svelte/icons/zap';
import { Permission } from '@platform/authz';
import { workspaceUrl } from '@platform/context';
import type { LucideIcon } from '@scylla/ui';
import { t } from '@scylla/ui/i18n';
import type { TriggerKind } from '@base/features/triggers';
import { jobShortId } from '@shared/presentation/presenters/job-run.presenter.ts';
import { getRelativeTime } from '@shared/utils/date-utils.ts';
import { toStatusState } from '@shared/utils/job-status.utils.ts';
import { getStatusConfig } from '@shared/utils/status-config.ts';
import { commandBarMessages as messages } from '@base/shell/presentation/layout/messages/command-bar.messages.ts';
import type {
  CommandGroupId,
  CommandRow,
  CommandSourcesData,
  Draft,
  RecentRow,
  RowsInput,
} from './command-row.ts';

const present = (texts: readonly (string | undefined | null)[]): string[] =>
  texts.filter((text): text is string => !!text);

const TRIGGER_ICONS: Record<TriggerKind, LucideIcon> = {
  cron: CalendarClockIcon,
  webhook: WebhookIcon,
  push: GitCommitHorizontalIcon,
  pullRequest: GitPullRequestIcon,
  tag: TagIcon,
  unknown: ZapIcon,
};

/** The place of a member: its role in the workspace, else its first role and where it is. */
export const memberPlace = (
  roles: CommandSourcesData['members'][number]['roles'],
): string | undefined => {
  if (!roles?.length) return undefined;
  const inWorkspace = roles.find(role => role.scopeKind === 'workspace');
  if (inWorkspace) return inWorkspace.roleName;
  const [first] = roles;
  return `${first.roleName} · ${first.scopeName}`;
};

/** A job shows the shape of its status, its number, its pipeline and project, and its start. */
const jobDrafts = (input: RowsInput, slug: string): Draft[] => {
  const { jobs = [], pipelines, projects, can, workspaceId, actions, now = Date.now() } = input;
  return jobs.flatMap((job): Draft[] => {
    const pipeline = pipelines.find(item => item.id === job.pipelineId);
    if (!pipeline) return [];
    const { projectId } = pipeline;
    const number = `#${jobShortId(job.id)}`;
    const place = present([pipeline.name, projects.find(item => item.id === projectId)?.name]).join(
      ' · ',
    );
    const origin =
      job.source?.branch ||
      job.source?.tag ||
      (job.triggerId ? t(messages.jobByTrigger) : undefined);
    const id = `job:${job.id}`;
    const go: Draft = {
      id,
      uid: job.id,
      group: 'jobs',
      name: number,
      type: t(messages.typeJob),
      place,
      facts: present([origin, getRelativeTime(job.createdAt, now)]).join(' · '),
      verb: t(messages.verbGo),
      icon: PlayIcon,
      look: {
        kind: 'status',
        state: toStatusState(job.status),
        label: t(getStatusConfig(job.status).label),
      },
      iconKey: job.status,
      effect: {
        kind: 'go',
        href: workspaceUrl(slug, `projects/${projectId}/pipelines/${pipeline.id}/jobs/${job.id}`),
      },
      projectId,
      found: true,
      say: messages.sayJob,
      keywords: [jobShortId(job.id), job.source?.branch, job.source?.tag, job.source?.title],
    };
    const target = { workspaceId: workspaceId ?? undefined, projectId };
    if (!actions || job.status !== 'failed' || !can(Permission.CREATE_JOB, target)) return [go];
    const rerun: Draft = {
      id: `rerun:${job.id}`,
      uid: job.id,
      group: 'jobs',
      name: t(messages.rerunName(number)),
      type: t(messages.typeJob),
      place,
      verb: t(messages.verbRerun),
      icon: RotateCcwIcon,
      effect: {
        kind: 'confirm',
        verb: t(messages.rerunName(number)),
        question: t(messages.rerunQuestion(number)),
        detail: t(messages.runDetail),
        run: async () => {
          await actions.rerunJob({ jobId: job.id, pipelineId: pipeline.id, projectId });
        },
      },
      projectId,
      found: true,
      follows: id,
      // The sentence names the job, not the label of the action.
      say: () => messages.sayRerun(number),
    };
    return [go, rerun];
  });
};

/** A trigger opens its edit page, which needs MANAGE_TRIGGERS on its project. */
const triggerDrafts = (input: RowsInput, slug: string): Draft[] =>
  (input.triggers ?? []).flatMap(({ trigger, projectId, pipelineName, projectName }): Draft[] => {
    const target = { workspaceId: input.workspaceId ?? undefined, projectId };
    if (!input.can(Permission.MANAGE_TRIGGERS, target)) return [];
    const id = `trigger:${trigger.id}`;
    const place = present([pipelineName, projectName]).join(' · ');
    const base = {
      uid: trigger.id,
      group: 'triggers',
      type: t(messages.typeTrigger),
      place,
      projectId,
      found: true,
    } as const;
    const go: Draft = {
      ...base,
      id,
      name: trigger.name,
      facts: t(trigger.enabled ? messages.triggerEnabled : messages.triggerDisabled),
      verb: t(messages.verbGo),
      icon: TRIGGER_ICONS[trigger.source.kind] ?? ZapIcon,
      iconKey: trigger.source.kind,
      effect: {
        kind: 'go',
        href: workspaceUrl(
          slug,
          `projects/${projectId}/pipelines/${trigger.pipelineId}/triggers/${trigger.id}/edit`,
        ),
      },
      say: messages.sayTrigger,
    };
    // A trigger of a pipeline file changes in the file only.
    const { actions } = input;
    if (!actions || trigger.fromFile) return [go];
    const variables = { triggerId: trigger.id, pipelineId: trigger.pipelineId };
    const toggle: Draft = trigger.enabled
      ? {
          ...base,
          id: `trigger-off:${trigger.id}`,
          name: t(messages.disableName(trigger.name)),
          verb: t(messages.verbDisable),
          icon: PowerOffIcon,
          effect: {
            kind: 'confirm',
            verb: t(messages.disableName(trigger.name)),
            question: t(messages.disableQuestion(trigger.name)),
            detail: t(messages.disableDetail),
            destructive: true,
            run: async () => {
              await actions.setTriggerEnabled({ ...variables, enabled: false });
            },
          },
          follows: id,
          say: () => messages.sayDisable(trigger.name),
        }
      : {
          ...base,
          id: `trigger-on:${trigger.id}`,
          name: t(messages.enableName(trigger.name)),
          verb: t(messages.verbEnable),
          icon: PowerIcon,
          effect: {
            kind: 'act',
            run: async () => {
              await actions.setTriggerEnabled({ ...variables, enabled: true });
            },
          },
          follows: id,
          say: () => messages.sayEnable(trigger.name),
        };
    return [go, toggle];
  });

/**
 * The secrets of the open project, then the secrets of the other projects that the server search
 * found: names only, never a value. Each one can copy its name.
 */
const secretDrafts = (input: RowsInput, slug: string): Draft[] => {
  const { project, actions } = input;
  interface Listed {
    name: string;
    projectId: string;
    projectName?: string;
    /** Set for a secret that the server search found. */
    secretId?: string;
  }
  const open: Listed[] = project.id
    ? input.secrets.map(({ name }) => ({
        name,
        projectId: project.id!,
        projectName: project.name ?? undefined,
      }))
    : [];
  const keys = new Set(open.map(item => `${item.projectId}:${item.name}`));
  const found: Listed[] = (input.workspaceSecrets ?? [])
    .filter(({ secret }) => !keys.has(`${secret.projectId}:${secret.name}`))
    .map(({ secret, projectName }) => ({
      name: secret.name,
      projectId: secret.projectId,
      projectName,
      secretId: secret.id,
    }));
  return [...open, ...found].flatMap(({ name, projectId, projectName, secretId }): Draft[] => {
    const id = `secret:${projectId}:${name}`;
    const base = {
      uid: secretId,
      group: 'secrets',
      type: t(messages.typeSecret),
      place: projectName,
      projectId,
      found: secretId ? true : undefined,
    } as const;
    const go: Draft = {
      ...base,
      id,
      name,
      facts: t(messages.secretScope),
      verb: t(messages.verbGo),
      icon: LockIcon,
      effect: { kind: 'go', href: workspaceUrl(slug, `projects/${projectId}/secrets`) },
      say: messages.saySecret,
    };
    if (!actions) return [go];
    const copy: Draft = {
      ...base,
      id: `copy-secret:${projectId}:${name}`,
      name: t(messages.copyName(name)),
      verb: t(messages.verbCopy),
      icon: CopyIcon,
      effect: { kind: 'act', run: () => actions.copyName(name) },
      follows: id,
      say: () => messages.sayCopy(name),
    };
    return [go, copy];
  });
};

/** A user of the instance opens its page in the administration. */
const userDrafts = (input: RowsInput): Draft[] =>
  (input.users ?? []).map(user => ({
    id: `user:${user.id}`,
    uid: user.id,
    group: 'users',
    name: user.displayName || user.username || user.email || user.id,
    type: t(messages.typeUser),
    place: user.email,
    facts: t(user.isActive ? messages.userActive : messages.userDisabled),
    verb: t(messages.verbGo),
    icon: UserRoundIcon,
    look: {
      kind: 'person',
      profile: {
        displayName: user.displayName,
        username: user.username,
        avatarUrl: user.avatarUrl,
        avatarColor: user.avatarColor,
      },
      self: user.id === input.selfId,
    },
    effect: { kind: 'go', href: `/admin/users/${encodeURIComponent(user.id)}` },
    found: true,
    say: messages.sayUser,
    keywords: [user.username],
  }));

/** A package of the marketplace: its publisher, its last version and its stars. */
const packageDrafts = (input: RowsInput, slug: string): Draft[] =>
  (input.packages ?? []).map(pkg => {
    const latest = pkg.versions.at(-1);
    return {
      id: `package:${pkg.id}`,
      uid: pkg.id,
      group: 'packages',
      name: pkg.name,
      type: t(messages.typePackage),
      place: pkg.publisher.handle,
      facts: present([
        latest && t(messages.packageVersion(latest.number)),
        t(messages.packageStars(pkg.stars)),
      ]).join(' · '),
      verb: t(messages.verbGo),
      icon: PackageIcon,
      effect: { kind: 'go', href: workspaceUrl(slug, `marketplace/${pkg.id}`) },
      say: messages.sayPackage,
      keywords: [pkg.id],
    };
  });

/** The rows of the kinds that the server finds with the text, and their actions. */
export const searchDrafts = (input: RowsInput, slug: string): Draft[] => [
  ...jobDrafts(input, slug),
  ...triggerDrafts(input, slug),
  ...secretDrafts(input, slug),
  ...userDrafts(input),
  ...packageDrafts(input, slug),
];

/** The kinds that the recent list stores whole: the bar has no live list of them with no text. */
const RECENT_KINDS: Readonly<
  Partial<
    Record<
      CommandGroupId,
      { icon: LucideIcon; type: MessageDescriptor; say: (label: string) => MessageDescriptor }
    >
  >
> = {
  jobs: { icon: PlayIcon, type: messages.typeJob, say: messages.sayJob },
  triggers: { icon: ZapIcon, type: messages.typeTrigger, say: messages.sayTrigger },
  secrets: { icon: LockIcon, type: messages.typeSecret, say: messages.saySecret },
  users: { icon: UserRoundIcon, type: messages.typeUser, say: messages.sayUser },
  packages: { icon: PackageIcon, type: messages.typePackage, say: messages.sayPackage },
};

/** What the recent list stores of a row: only a row that opens a page of these kinds. */
export const toRecentRow = (row: CommandRow): RecentRow | undefined => {
  if (!RECENT_KINDS[row.group] || row.effect.kind !== 'go') return undefined;
  const look =
    row.look && (row.look.kind === 'status' || row.look.kind === 'person') ? row.look : undefined;
  return {
    id: row.id,
    group: row.group,
    name: row.name,
    ...(row.place && { place: row.place }),
    href: row.effect.href,
    ...(look && { look }),
  };
};

/** A stored row of the recent list, as a row of the bar. */
export const recentDraft = (row: RecentRow): Draft => {
  const kind = RECENT_KINDS[row.group];
  return {
    id: row.id,
    group: row.group,
    name: row.name,
    type: kind ? t(kind.type) : '',
    place: row.place,
    verb: t(messages.verbGo),
    icon: kind?.icon ?? FileTextIcon,
    look: row.look,
    effect: { kind: 'go', href: row.href },
    say: kind?.say ?? messages.sayPage,
  };
};
