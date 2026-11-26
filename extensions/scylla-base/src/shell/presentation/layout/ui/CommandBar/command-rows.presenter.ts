import type { MessageDescriptor } from '@lingui/core';
import BlocksIcon from '@lucide/svelte/icons/blocks';
import Building2Icon from '@lucide/svelte/icons/building-2';
import FileTextIcon from '@lucide/svelte/icons/file-text';
import FolderIcon from '@lucide/svelte/icons/folder';
import FolderPlusIcon from '@lucide/svelte/icons/folder-plus';
import GitForkIcon from '@lucide/svelte/icons/git-fork';
import KeyRoundIcon from '@lucide/svelte/icons/key-round';
import LayersIcon from '@lucide/svelte/icons/layers';
import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
import LayoutListIcon from '@lucide/svelte/icons/layout-list';
import LinkIcon from '@lucide/svelte/icons/link';
import LockIcon from '@lucide/svelte/icons/lock';
import PlayIcon from '@lucide/svelte/icons/play';
import ServerIcon from '@lucide/svelte/icons/server';
import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
import UserRoundIcon from '@lucide/svelte/icons/user-round';
import UsersIcon from '@lucide/svelte/icons/users';
import WorkflowIcon from '@lucide/svelte/icons/workflow';
import { Permission, type PermissionTarget } from '@platform/authz';
import { workspaceUrl } from '@platform/context';
import type {
  ActionCommand,
  AppNavLink,
  ChoiceCommand,
  CommandDefinition,
  CommandForm,
  ConfirmCommand,
  CreateCommand,
  ToggleCommand,
} from '@scylla/core-sdk';
import type { EntityIconProps, LucideIcon } from '@scylla/ui';
import { t } from '@scylla/ui/i18n';
import { prepareFuzzyText, type FuzzyFields } from '@scylla/ui/utils';
import { agentProfile, type AppEntity } from '@base/features/apps';
import type { DashboardEntry } from '@base/features/dashboard';
import {
  newProjectPath,
  projectIconProps,
  type ProjectGroupEntity,
  type ProjectIcon,
} from '@base/features/project';
import { roleName, type RoleEntity } from '@base/features/roles';
import {
  allWorkspacesHref,
  ownerName,
  workspaceCounts,
  workspaceIconProps,
  workspaceRoleLabel,
  type WorkspaceEntity,
  type WorkspaceOwnerEntity,
} from '@base/features/workspace';
import type {
  IdentityKind,
  UserIdentityProfile,
} from '@shared/presentation/presenters/user-identity.presenter.ts';
import { commandBarMessages as messages } from '@base/shell/presentation/layout/messages/command-bar.messages.ts';
import { layoutMessages } from '@base/shell/presentation/layout/messages/layout.messages.ts';

export type CommandGroupId =
  | 'pages'
  | 'preferences'
  | 'actions'
  | 'projects'
  | 'groups'
  | 'pipelines'
  | 'fragments'
  | 'dashboards'
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
  | { kind: 'act'; run: () => void | Promise<void> }
  | { kind: 'run'; pipelineId: string; verb: string; question: string; detail: string }
  | { kind: 'switch'; workspace: { id: string; name: string; slug: string } };

/** The own avatar of an entity row, in place of the icon of its kind. */
export type RowLook =
  | { kind: IdentityKind; profile: UserIdentityProfile; self?: boolean }
  | { kind: 'project'; icon: EntityIconProps }
  | { kind: 'workspace'; icon: EntityIconProps };

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
  /** A person, an agent, an app or a project shows as everywhere else: its photo or its icon. */
  look?: RowLook;
  /** The color of `icon`, e.g. the folder of a group. Unset: grey. */
  iconColor?: string;
  /** Changes when the icon changes: the new icon then takes the place of the old one. */
  iconKey?: string;
  /** A glyph before the place, e.g. the folder of the group of a project. */
  placeGlyph?: { icon: LucideIcon; color?: string };
  /**
   * More facts after the place, e.g. the number of projects of a group, or the role of the user and
   * the counts of a workspace. Not searched.
   */
  facts?: string;
  /** The owner of a workspace: its avatar shows before the place. */
  owner?: WorkspaceOwnerEntity;
  effect: RowEffect;
  /** `true`: the row acts on the current page. */
  here?: boolean;
  /** `true`: the row shows only under the chip of its group. A row of another group is the same. */
  chipOnly?: boolean;
  /** `run`: the row shows only when the text starts with a word that means to run. */
  gate?: 'run';
  projectId?: string;
  /** The order in the group, before the score: 0 first. */
  rank?: number;
  /** Shows with the results of its group, also when the text does not match it. */
  pinned?: boolean;
  fields: FuzzyFields;
}

/** A workspace of the bar. The details come with the lists of the server. */
export type CommandWorkspace = Pick<WorkspaceEntity, 'id' | 'name' | 'slug'> &
  Partial<Pick<WorkspaceEntity, 'icon' | 'owner' | 'role' | 'memberCount' | 'projectCount'>>;

export interface CommandSourcesData {
  projects: readonly { id: string; name: string; icon?: ProjectIcon; groupId?: string }[];
  /** The groups of the projects: a row for each one, and a new project in each one. */
  groups: readonly Pick<ProjectGroupEntity, 'id' | 'name' | 'color'>[];
  pipelines: readonly { id: string; name: string; projectId: string }[];
  fragments: readonly {
    id: string;
    name: string;
    tags?: readonly string[];
    source?: { kind: 'linked' | 'forked' };
  }[];
  /** Not set while the bar cannot read them. */
  dashboards?: readonly DashboardEntry[];
  apps: readonly ({ id: string; name: string; runner: boolean } & Partial<Pick<AppEntity, 'icon'>>)[];
  members: readonly {
    actorId: string;
    actorKind: string;
    displayName: string;
    handle: string;
    avatarUrl?: string;
    avatarColor?: string;
  }[];
  /** The account of the session: its row shows the avatar of the reader, and « You » names it. */
  selfId?: string;
  workspaceRoles: readonly RoleEntity[];
  instanceRoles: readonly RoleEntity[];
  secrets: readonly { name: string }[];
  workspaces: readonly CommandWorkspace[];
  /** The workspaces of other users that the search finds: only for an instance admin. */
  otherWorkspaces: readonly CommandWorkspace[];
}

export interface RowsInput extends CommandSourcesData {
  links: readonly AppNavLink[];
  commands: readonly CommandDefinition[];
  slug?: string;
  workspaceId: string | null;
  project: { id: string | null; name: string | null };
  /** The pipeline in the URL. */
  pipelineId?: string;
  /** The text of the search, with no filter prefix. */
  search?: string;
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

const actionDraft = (command: ActionCommand, base: Draft): Draft => ({
  ...base,
  group: 'actions',
  type: t(messages.typeAction),
  verb: t(messages.verbOpen),
  effect: { kind: 'act', run: command.run },
  say: messages.sayAction,
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
      case 'action':
        return [actionDraft(command, base)];
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
      href:
        scope === 'access'
          ? workspaceUrl(slug, `access/roles/${encodeURIComponent(role.key)}`)
          : `/admin/roles/${encodeURIComponent(role.key)}`,
    },
    say: messages.sayRole,
  }));

/** A new project in each group, as the "+" of the group on the projects page. */
const newProjectDrafts = ({ slug, workspaceId, groups, can }: RowsInput): Draft[] =>
  slug && can(Permission.CREATE_PROJECT, { workspaceId: workspaceId ?? undefined })
    ? groups.map(({ id, name }) => ({
        id: `new-project-in:${id}`,
        uid: id,
        group: 'actions',
        name: t(layoutMessages.newProjectIn(name)),
        type: t(messages.typeAction),
        verb: t(messages.verbCreate),
        icon: FolderPlusIcon,
        effect: { kind: 'go', href: workspaceUrl(slug, newProjectPath(id)) },
        say: messages.sayForm,
      }))
    : [];

/** A project shows its icon, and its group as its place, with the folder of the group. */
const projectDrafts = ({ projects, groups }: RowsInput, slug: string): Draft[] =>
  projects.map(({ id, name, icon, groupId }): Draft => {
    const group = groupId ? groups.find(item => item.id === groupId) : undefined;
    return {
      id: `project:${id}`,
      uid: id,
      group: 'projects',
      name,
      type: t(messages.typeProject),
      place: group?.name,
      placeGlyph: group && { icon: FolderIcon, color: group.color },
      verb: t(messages.verbGo),
      icon: FolderIcon,
      look: { kind: 'project', icon: projectIconProps(icon) },
      iconKey: JSON.stringify(icon ?? null),
      effect: { kind: 'go', href: workspaceUrl(slug, `projects/${id}`) },
      projectId: id,
      say: messages.sayProject,
    };
  });

/** A group opens the projects page on it. It counts the projects of the lookup. */
const groupDrafts = ({ groups, projects, can, workspaceId }: RowsInput, slug: string): Draft[] => {
  if (!can(Permission.READ_WORKSPACE, { workspaceId: workspaceId ?? undefined })) return [];
  return groups.map(({ id, name, color }): Draft => ({
    id: `group:${id}`,
    uid: id,
    group: 'groups',
    name,
    type: t(messages.typeGroup),
    facts: t(messages.projectCount(projects.filter(project => project.groupId === id).length)),
    verb: t(messages.verbGo),
    icon: FolderIcon,
    iconColor: color,
    iconKey: color ?? '',
    effect: { kind: 'go', href: workspaceUrl(slug, `projects?group=${encodeURIComponent(id)}`) },
    say: messages.sayGroup,
  }));
};

const FRAGMENT_ICONS = { linked: LinkIcon, forked: GitForkIcon } as const;

/** A fragment of the library, with the icon of the library: its own, linked or forked. */
const fragmentDrafts = ({ fragments }: RowsInput, slug: string): Draft[] =>
  fragments.map(({ id, name, tags, source }): Draft => ({
    id: `fragment:${id}`,
    uid: id,
    group: 'fragments',
    name,
    type: t(messages.typeFragment),
    place: source && t(source.kind === 'linked' ? messages.fragmentLinked : messages.fragmentForked),
    verb: t(messages.verbGo),
    icon: source ? FRAGMENT_ICONS[source.kind] : LayersIcon,
    effect: { kind: 'go', href: workspaceUrl(slug, `library/${id}`) },
    say: messages.sayFragment,
    keywords: tags,
  }));

/** The name of the creator of a dashboard: « You », else the member of the workspace. */
const creatorOf = ({ selfId, members }: RowsInput, id: string | undefined): string | undefined => {
  if (!id) return undefined;
  if (id === selfId) return t(messages.you);
  const member = members.find(item => item.actorId === id);
  return member ? member.displayName || member.handle : undefined;
};

/** A dashboard is personal or shared with the workspace; a shared one names its creator. */
const dashboardDrafts = (input: RowsInput, slug: string): Draft[] =>
  (input.dashboards ?? []).map((dashboard): Draft => {
    const shared = dashboard.visibility === 'workspace';
    const creator = shared ? creatorOf(input, dashboard.createdBy) : undefined;
    return {
      id: `dashboard:${dashboard.id}`,
      uid: dashboard.id,
      group: 'dashboards',
      name: dashboard.name,
      type: t(messages.typeDashboard),
      place: t(shared ? messages.dashboardShared : messages.dashboardPersonal),
      placeGlyph: { icon: shared ? UsersIcon : LockIcon },
      facts:
        present([creator, dashboard.teamDefault ? t(messages.teamDefault) : undefined]).join(
          ' · ',
        ) || undefined,
      verb: t(messages.verbGo),
      icon: LayoutDashboardIcon,
      effect: { kind: 'go', href: workspaceUrl(slug, dashboard.path) },
      say: messages.sayDashboard,
      searchPlace: [creator],
    };
  });

/**
 * The workspaces of the user, with the owner, the role and the counts. An instance admin also gets
 * the workspaces of other users that the search finds, after its own, then the list of all.
 */
const workspaceDrafts = (input: RowsInput): Draft[] => {
  const seesAll = input.can(Permission.LIST_ALL_WORKSPACES);
  const draft = (workspace: CommandWorkspace, rank: number): Draft => {
    const current = workspace.id === input.workspaceId;
    const owner = workspace.owner && ownerName(workspace.owner);
    const facts = present([workspaceRoleLabel(workspace.role, seesAll), ...workspaceCounts(workspace)]);
    return {
      id: `workspace:${workspace.id}`,
      group: 'workspaces',
      name: workspace.name,
      type: t(messages.typeWorkspace),
      place: owner,
      facts: facts.join(' · ') || undefined,
      owner: workspace.owner,
      rank,
      verb: current ? undefined : t(messages.verbSwitch),
      icon: Building2Icon,
      look: { kind: 'workspace', icon: workspaceIconProps(workspace.icon) },
      iconKey: JSON.stringify(workspace.icon ?? null),
      effect: {
        kind: 'switch',
        workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
      },
      say: current
        ? messages.sayCurrent
        : () =>
            owner ? messages.saySwitchOf(workspace.name, owner) : messages.saySwitch(workspace.name),
      keywords: [workspace.slug, workspace.owner?.username, workspace.owner?.email],
    };
  };

  const own = input.workspaces.map(workspace => draft(workspace, 0));
  if (!seesAll) return own;
  const mine = new Set(input.workspaces.map(workspace => workspace.id));
  const others = input.otherWorkspaces
    .filter(workspace => !mine.has(workspace.id))
    .map(workspace => draft(workspace, 1));
  const all: Draft = {
    id: 'workspaces:all',
    group: 'workspaces',
    name: t(messages.allWorkspaces),
    type: t(messages.typePage),
    verb: t(messages.verbGo),
    icon: LayoutListIcon,
    effect: { kind: 'go', href: allWorkspacesHref(input.search ?? '') },
    rank: 2,
    pinned: true,
    say: () => messages.sayAllWorkspaces,
    keywords: [input.other(messages.allWorkspaces)],
  };
  return [...own, ...others, all];
};

const entityDrafts = (input: RowsInput): Draft[] => {
  const { slug, project } = input;
  const workspaces = workspaceDrafts(input);
  if (!slug) return workspaces;

  return [
    ...projectDrafts(input, slug),
    ...groupDrafts(input, slug),
    ...pipelineDrafts(input),
    ...fragmentDrafts(input, slug),
    ...dashboardDrafts(input, slug),
    ...input.apps.map(
      ({ id, name, runner, icon }): Draft => ({
        id: `app:${id}`,
        uid: id,
        group: 'machines',
        name,
        type: t(runner ? messages.typeAgent : messages.typeApp),
        verb: t(messages.verbGo),
        icon: runner ? ServerIcon : BlocksIcon,
        look: { kind: runner ? 'agent' : 'app', profile: agentProfile({ name, icon }) },
        effect: { kind: 'go', href: workspaceUrl(slug, `${runner ? 'agents' : 'apps'}/${id}`) },
        say: runner ? messages.sayAgent : messages.sayApp,
      }),
    ),
    ...input.members
      .filter(member => member.actorKind === 'user')
      .map(
        ({ actorId, displayName, handle, avatarUrl, avatarColor }): Draft => ({
          id: `member:${actorId}`,
          uid: actorId,
          group: 'people',
          name: displayName || handle,
          type: t(messages.typeMember),
          place: displayName ? handle : undefined,
          verb: t(messages.verbGo),
          icon: UserRoundIcon,
          look: {
            kind: 'person',
            profile: { displayName, username: handle, avatarUrl, avatarColor },
            self: actorId === input.selfId,
          },
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

const DASHBOARD_PAGE_ID = 'page:workspace/dashboard';

/**
 * With no dashboard on the server, the chip of the dashboards shows the page of the dashboard:
 * the page creates the first one, the bar never does. The row keeps the id of the page, so a pick
 * goes to the recent rows as the page.
 */
const emptyDashboardDrafts = (input: RowsInput, pages: readonly Draft[]): Draft[] => {
  const page = pages.find(draft => draft.id === DASHBOARD_PAGE_ID);
  return page && input.dashboards?.length === 0 ? [{ ...page, group: 'dashboards', chipOnly: true }] : [];
};

const identityOf = (draft: Draft): string => `${draft.name}\n${draft.type}\n${draft.place ?? ''}`;

/**
 * All that the bar can show. Two rows with the same name, type and place show the start of their
 * id: two rows must not read the same.
 */
export const buildCommandRows = (input: RowsInput): CommandRow[] => {
  const pages = pageDrafts(input);
  const drafts = [
    ...pages,
    ...commandDrafts(input),
    ...newProjectDrafts(input),
    ...entityDrafts(input),
    ...emptyDashboardDrafts(input, pages),
  ];

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
