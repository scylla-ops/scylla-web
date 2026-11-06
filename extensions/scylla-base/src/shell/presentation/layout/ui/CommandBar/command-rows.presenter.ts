import type { MessageDescriptor } from '@lingui/core';
import BlocksIcon from '@lucide/svelte/icons/blocks';
import Building2Icon from '@lucide/svelte/icons/building-2';
import FileTextIcon from '@lucide/svelte/icons/file-text';
import FolderIcon from '@lucide/svelte/icons/folder';
import KeyRoundIcon from '@lucide/svelte/icons/key-round';
import PlayIcon from '@lucide/svelte/icons/play';
import ServerIcon from '@lucide/svelte/icons/server';
import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
import UserRoundIcon from '@lucide/svelte/icons/user-round';
import WorkflowIcon from '@lucide/svelte/icons/workflow';
import { Permission, type PermissionTarget } from '@platform/authz';
import { workspaceUrl } from '@platform/context';
import type {
  AppNavLink,
  ChoiceCommand,
  CommandDefinition,
  CommandForm,
  ConfirmCommand,
  CreateCommand,
  ToggleCommand,
} from '@scylla/core-sdk';
import type { LucideIcon } from '@scylla/ui';
import { t } from '@scylla/ui/i18n';
import { prepareFuzzyText, type FuzzyFields } from '@scylla/ui/utils';
import { roleName, type RoleEntity } from '@base/features/roles';
import { commandBarMessages as messages } from '@base/shell/presentation/layout/messages/command-bar.messages.ts';
import { layoutMessages } from '@base/shell/presentation/layout/messages/layout.messages.ts';

export type CommandGroupId =
  | 'pages'
  | 'preferences'
  | 'actions'
  | 'projects'
  | 'pipelines'
  | 'machines'
  | 'people'
  | 'roles'
  | 'secrets'
  | 'workspaces';

export type RowEffect =
  | { kind: 'go'; href: string }
  | { kind: 'form'; form: CommandForm }
  | {
      kind: 'change';
      apply: () => void | Promise<void>;
      undo?: () => void | Promise<void>;
      /** The text of the toast. */
      done: string;
    }
  | {
      kind: 'confirm';
      verb: string;
      question: string;
      detail?: string;
      run: () => void | Promise<void>;
    }
  | { kind: 'run'; pipelineId: string; verb: string; question: string; detail: string }
  | { kind: 'switch'; workspace: { id: string; name: string; slug: string } };

export interface CommandRow {
  /** Stable from a session to the next one: the list of the recent rows stores it. */
  id: string;
  group: CommandGroupId;
  name: string;
  type: string;
  place?: string;
  /** What Enter does. No verb: the row is the current value, and Enter does nothing. */
  verb?: string;
  /** The full text of what Enter does, for the footer and for a screen reader. */
  sentence: string;
  icon: LucideIcon;
  effect: RowEffect;
  /** `true`: the row acts on the current page. */
  here?: boolean;
  /** `run`: the row shows only when the text starts with a word that means to run. */
  gate?: 'run';
  projectId?: string;
  fields: FuzzyFields;
}

export interface CommandSourcesData {
  projects: readonly { id: string; name: string }[];
  pipelines: readonly { id: string; name: string; projectId: string }[];
  apps: readonly { id: string; name: string; runner: boolean }[];
  members: readonly { actorId: string; actorKind: string; displayName: string; handle: string }[];
  workspaceRoles: readonly RoleEntity[];
  instanceRoles: readonly RoleEntity[];
  secrets: readonly { name: string }[];
  workspaces: readonly { id: string; name: string; slug: string }[];
}

export interface RowsInput extends CommandSourcesData {
  links: readonly AppNavLink[];
  commands: readonly CommandDefinition[];
  slug?: string;
  workspaceId: string | null;
  project: { id: string | null; name: string | null };
  /** The pipeline in the URL. */
  pipelineId?: string;
  can: (permission: Permission, target?: PermissionTarget) => boolean;
  /** The text of a message in the other language. */
  other: (message: MessageDescriptor | undefined) => string | undefined;
}

interface Draft extends Omit<CommandRow, 'sentence' | 'fields'> {
  say: (label: string) => MessageDescriptor;
  /** The id of the entity: the row with the same name, type and place shows its start. */
  uid?: string;
  keywords?: readonly (string | undefined)[];
  /** Other words of the place, which do not show. */
  searchPlace?: readonly (string | undefined)[];
}

const present = (texts: readonly (string | undefined | null)[]): string[] =>
  texts.filter((text): text is string => !!text);

const pageDrafts = ({ links, project, pipelineId, other }: RowsInput): Draft[] =>
  links.map(link => {
    const inProject = link.section.id === 'project';
    const section = t(link.section.title);
    const group = link.group && t(link.group);
    const place = present([
      inProject ? (project.name ?? section) : link.section.id === 'workspace' ? null : section,
      group,
    ]).join(' · ');
    return {
      id: `page:${link.section.id}/${link.url}`,
      group: 'pages',
      name: t(link.title),
      type: t(messages.typePage),
      place: place || undefined,
      verb: t(messages.verbGo),
      icon: link.icon ?? FileTextIcon,
      effect: { kind: 'go', href: link.href },
      here: inProject && !pipelineId,
      say: messages.sayPage,
      keywords: [link.keywords && t(link.keywords), other(link.title), other(link.keywords)],
      searchPlace: [section, other(link.section.title), other(link.group)],
    };
  });

const goDraft = (base: Draft, href: string): Draft => ({
  ...base,
  group: 'pages',
  type: t(messages.typePage),
  verb: t(messages.verbGo),
  effect: { kind: 'go', href },
  say: messages.sayPage,
});

const createDraft = (command: CreateCommand, base: Draft): Draft | null => {
  const href = 'path' in command.form ? command.form.path() : null;
  if ('path' in command.form && !href) return null;
  return {
    ...base,
    group: 'actions',
    type: t(messages.typeAction),
    verb: t(messages.verbCreate),
    effect: href ? { kind: 'go', href } : { kind: 'form', form: command.form as CommandForm },
    say: messages.sayForm,
  };
};

const choiceDraft = (
  command: ChoiceCommand,
  base: Draft,
  commands: readonly CommandDefinition[],
): Draft => {
  const previous = commands.find(
    (other): other is ChoiceCommand =>
      other.kind === 'choice' && other.type.id === command.type.id && other.current(),
  );
  const current = command.current();
  const now = previous ? t(previous.title) : '';
  return {
    ...base,
    group: 'preferences',
    type: t(command.type),
    verb: current ? undefined : t(messages.verbUse),
    effect: {
      kind: 'change',
      apply: command.select,
      undo: previous?.select,
      done: t(messages.nowUsing(base.name)),
    },
    say: current ? messages.sayCurrent : label => messages.sayUse(label, now),
  };
};

const toggleDraft = (command: ToggleCommand, base: Draft): Draft => {
  const on = command.on();
  return {
    ...base,
    group: 'preferences',
    type: t(command.type),
    verb: t(on ? messages.verbTurnOff : messages.verbTurnOn),
    effect: {
      kind: 'change',
      apply: () => command.set(!on),
      undo: () => command.set(on),
      done: t(on ? messages.turnedOff(base.name) : messages.turnedOn(base.name)),
    },
    say: on ? messages.sayTurnOff : messages.sayTurnOn,
  };
};

const confirmDraft = (command: ConfirmCommand, base: Draft): Draft => ({
  ...base,
  group: 'actions',
  type: t(command.type),
  verb: `${t(command.verb)}…`,
  effect: {
    kind: 'confirm',
    verb: t(command.verb),
    question: t(command.question),
    detail: command.detail && t(command.detail),
    run: command.run,
  },
  say: messages.sayConfirm,
});

const commandDrafts = (input: RowsInput): Draft[] =>
  input.commands.flatMap((command): Draft[] => {
    if (command.permission && !input.can(command.permission)) return [];
    if (command.available && !command.available()) return [];

    const place = command.place?.();
    const base: Draft = {
      id: `command:${command.id}`,
      group: 'actions',
      name: t(command.title),
      type: '',
      place: typeof place === 'object' ? t(place) : place,
      icon: command.icon,
      effect: { kind: 'go', href: '' },
      here: command.here?.(),
      say: messages.sayPage,
      keywords: [
        command.keywords && t(command.keywords),
        input.other(command.title),
        input.other(command.keywords),
      ],
    };

    switch (command.kind) {
      case 'go': {
        const href = command.path();
        return href ? [goDraft(base, href)] : [];
      }
      case 'create': {
        const draft = createDraft(command, base);
        return draft ? [draft] : [];
      }
      case 'choice':
        return [choiceDraft(command, base, input.commands)];
      case 'toggle':
        return [toggleDraft(command, base)];
      case 'confirm':
        return [confirmDraft(command, base)];
    }
  });

const pipelineDrafts = (input: RowsInput): Draft[] => {
  const { slug, workspaceId, pipelines, projects, pipelineId, can, other } = input;
  if (!slug) return [];
  const projectName = (id: string) => projects.find(project => project.id === id)?.name;
  return pipelines.flatMap(({ id, name, projectId }): Draft[] => {
    const place = projectName(projectId);
    const go: Draft = {
      id: `pipeline:${id}`,
      uid: id,
      group: 'pipelines',
      name,
      type: t(messages.typePipeline),
      place,
      verb: t(messages.verbGo),
      icon: WorkflowIcon,
      effect: {
        kind: 'go',
        href: workspaceUrl(slug, `projects/${projectId}/pipelines/${id}/jobs`),
      },
      projectId,
      say: messages.sayPipeline,
    };
    if (!can(Permission.RUN_PIPELINE, { workspaceId: workspaceId ?? undefined, projectId })) {
      return [go];
    }
    const run: Draft = {
      id: `run:${id}`,
      uid: id,
      group: 'actions',
      name: t(messages.runName(name)),
      type: t(messages.typePipeline),
      place,
      verb: t(messages.verbRun),
      icon: PlayIcon,
      effect: {
        kind: 'run',
        pipelineId: id,
        verb: t(messages.runName(name)),
        question: t(messages.runQuestion(name)),
        detail: t(messages.runDetail),
      },
      here: id === pipelineId,
      gate: 'run',
      projectId,
      say: messages.sayRun,
      keywords: [t(messages.runKeywords), other(messages.runKeywords)],
    };
    return [go, run];
  });
};

const roleDrafts = (
  roles: readonly RoleEntity[],
  scope: 'access' | 'instance',
  slug: string,
): Draft[] =>
  roles.map(role => ({
    id: `role:${scope}:${role.key}`,
    uid: role.key,
    group: 'roles',
    name: roleName(role),
    type: t(messages.typeRole),
    place: t(scope === 'access' ? layoutMessages.access : layoutMessages.instance),
    verb: t(messages.verbGo),
    icon: ShieldCheckIcon,
    effect: {
      kind: 'go',
      href: workspaceUrl(slug, `${scope}/roles/${encodeURIComponent(role.key)}`),
    },
    say: messages.sayRole,
  }));

const entityDrafts = (input: RowsInput): Draft[] => {
  const { slug, project, workspaceId } = input;
  const workspaces = input.workspaces.map(
    (workspace): Draft => ({
      id: `workspace:${workspace.id}`,
      uid: workspace.id,
      group: 'workspaces',
      name: workspace.name,
      type: t(messages.typeWorkspace),
      verb: workspace.id === workspaceId ? undefined : t(messages.verbSwitch),
      icon: Building2Icon,
      effect: { kind: 'switch', workspace },
      say: workspace.id === workspaceId ? messages.sayCurrent : messages.saySwitch,
    }),
  );
  if (!slug) return workspaces;

  return [
    ...input.projects.map(
      ({ id, name }): Draft => ({
        id: `project:${id}`,
        uid: id,
        group: 'projects',
        name,
        type: t(messages.typeProject),
        verb: t(messages.verbGo),
        icon: FolderIcon,
        effect: { kind: 'go', href: workspaceUrl(slug, `projects/${id}`) },
        projectId: id,
        say: messages.sayProject,
      }),
    ),
    ...pipelineDrafts(input),
    ...input.apps.map(
      ({ id, name, runner }): Draft => ({
        id: `app:${id}`,
        uid: id,
        group: 'machines',
        name,
        type: t(runner ? messages.typeAgent : messages.typeApp),
        verb: t(messages.verbGo),
        icon: runner ? ServerIcon : BlocksIcon,
        effect: { kind: 'go', href: workspaceUrl(slug, `${runner ? 'agents' : 'apps'}/${id}`) },
        say: runner ? messages.sayAgent : messages.sayApp,
      }),
    ),
    ...input.members
      .filter(member => member.actorKind === 'user')
      .map(
        ({ actorId, displayName, handle }): Draft => ({
          id: `member:${actorId}`,
          uid: actorId,
          group: 'people',
          name: displayName || handle,
          type: t(messages.typeMember),
          place: displayName ? handle : undefined,
          verb: t(messages.verbGo),
          icon: UserRoundIcon,
          effect: { kind: 'go', href: workspaceUrl(slug, `access/members/${actorId}`) },
          say: messages.sayMember,
        }),
      ),
    ...roleDrafts(input.workspaceRoles, 'access', slug),
    ...roleDrafts(input.instanceRoles, 'instance', slug),
    ...input.secrets.flatMap(({ name }): Draft[] =>
      project.id
        ? [
            {
              id: `secret:${project.id}:${name}`,
              group: 'secrets',
              name,
              type: t(messages.typeSecret),
              place: project.name ?? undefined,
              verb: t(messages.verbGo),
              icon: KeyRoundIcon,
              effect: { kind: 'go', href: workspaceUrl(slug, `projects/${project.id}/secrets`) },
              projectId: project.id,
              say: messages.saySecret,
            },
          ]
        : [],
    ),
    ...workspaces,
  ];
};

const identityOf = (draft: Draft): string => `${draft.name}\n${draft.type}\n${draft.place ?? ''}`;

/**
 * All that the bar can show. Two rows with the same name, type and place show the start of their
 * id: two rows must not read the same.
 */
export const buildCommandRows = (input: RowsInput): CommandRow[] => {
  const drafts = [...pageDrafts(input), ...commandDrafts(input), ...entityDrafts(input)];

  const counts = new Map<string, number>();
  for (const draft of drafts) {
    counts.set(identityOf(draft), (counts.get(identityOf(draft)) ?? 0) + 1);
  }

  return drafts.map(({ say, uid, keywords = [], searchPlace = [], ...draft }) => {
    const repeated = (counts.get(identityOf({ say, uid, ...draft })) ?? 0) > 1;
    const place = repeated && uid ? present([draft.place, uid.slice(0, 4)]).join(' · ') : draft.place;
    const label = place ? `${draft.name} (${place})` : draft.name;
    return {
      ...draft,
      place,
      sentence: t(say(label)),
      fields: {
        name: prepareFuzzyText(draft.name),
        keywords: present(keywords).map(prepareFuzzyText),
        place: prepareFuzzyText(present([draft.type, draft.place, ...searchPlace]).join(' ')),
      },
    };
  });
};
