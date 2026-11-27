import type { MessageDescriptor } from '@lingui/core';
import type { Permission, PermissionTarget } from '@platform/authz';
import type { AppNavLink, CommandDefinition, CommandForm } from '@scylla/core-sdk';
import type { EntityIconProps, LucideIcon, StatusState } from '@scylla/ui';
import type { FuzzyFields } from '@scylla/ui/utils';
import type { AppEntity } from '@base/features/apps';
import type { DashboardEntry } from '@base/features/dashboard';
import type { JobEntity } from '@base/features/jobs';
import type { MarketPackage } from '@base/features/marketplace';
import type { ProjectGroupEntity, ProjectIcon } from '@base/features/project';
import type { RoleEntity } from '@base/features/roles';
import type { SecretEntity } from '@base/features/secret';
import type { TriggerEntity } from '@base/features/triggers';
import type { UserEntity } from '@base/features/user';
import type { WorkspaceEntity, WorkspaceOwnerEntity } from '@base/features/workspace';
import type {
  IdentityKind,
  UserIdentityProfile,
} from '@shared/presentation/presenters/user-identity.presenter.ts';

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
  | 'workspaces'
  | 'jobs'
  | 'triggers'
  | 'users'
  | 'packages';

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
      /** The verb deletes, removes or stops something: the button has the destructive variant. */
      destructive?: boolean;
      run: () => void | Promise<void>;
    }
  | { kind: 'act'; run: () => void | Promise<void> }
  | { kind: 'run'; pipelineId: string; verb: string; question: string; detail: string }
  | { kind: 'switch'; workspace: { id: string; name: string; slug: string } };

/** The own avatar of an entity row, in place of the icon of its kind. */
export type RowLook =
  | { kind: IdentityKind; profile: UserIdentityProfile; self?: boolean }
  | { kind: 'project'; icon: EntityIconProps }
  | { kind: 'workspace'; icon: EntityIconProps }
  /** A job: the shape of its status, as in the lists of the jobs. */
  | { kind: 'status'; state: StatusState; label: string };

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
  /**
   * The server found the row with the text of the bar, e.g. by the commit title of a job: it shows
   * also when the letters do not match its fields.
   */
  found?: boolean;
  /** The id of the row that this action acts on: it shows just after that row. */
  follows?: string;
  fields: FuzzyFields;
}

/** A workspace of the bar. The details come with the lists of the server. */
export type CommandWorkspace = Pick<WorkspaceEntity, 'id' | 'name' | 'slug'> &
  Partial<Pick<WorkspaceEntity, 'icon' | 'owner' | 'role' | 'memberCount' | 'projectCount'>>;

/** A job that the server search found. */
export type CommandJob = Pick<
  JobEntity,
  'id' | 'pipelineId' | 'status' | 'createdAt' | 'triggerId'
> & {
  source?: Pick<NonNullable<JobEntity['source']>, 'branch' | 'tag' | 'title'>;
};

/** A trigger that the server search found, with the names of its pipeline and of its project. */
export interface CommandTrigger {
  trigger: Pick<TriggerEntity, 'id' | 'pipelineId' | 'name' | 'enabled' | 'fromFile'> & {
    source: Pick<TriggerEntity['source'], 'kind'>;
  };
  projectId: string;
  pipelineName: string;
  projectName: string;
}

/** A secret of any project that the server search found: never a value. */
export interface CommandSecret {
  secret: Pick<SecretEntity, 'id' | 'name' | 'projectId'>;
  projectName: string;
}

export type CommandUser = Pick<
  UserEntity,
  'id' | 'username' | 'email' | 'displayName' | 'avatarUrl' | 'avatarColor' | 'isActive'
>;

export type CommandPackage = Pick<MarketPackage, 'id' | 'name' | 'stars'> & {
  publisher: Pick<MarketPackage['publisher'], 'handle'>;
  versions: readonly Pick<MarketPackage['versions'][number], 'number'>[];
};

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
  apps: readonly ({ id: string; name: string; runner: boolean } & Partial<
    Pick<AppEntity, 'icon'>
  >)[];
  members: readonly {
    actorId: string;
    actorKind: string;
    displayName: string;
    handle: string;
    avatarUrl?: string;
    avatarColor?: string;
    /** The roles of the member: the row shows the role in the workspace, else the first one. */
    roles?: readonly { scopeKind: string; scopeName: string; roleName: string }[];
  }[];
  /** The account of the session: its row shows the avatar of the reader, and « You » names it. */
  selfId?: string;
  workspaceRoles: readonly RoleEntity[];
  instanceRoles: readonly RoleEntity[];
  secrets: readonly { name: string }[];
  workspaces: readonly CommandWorkspace[];
  /** The workspaces of other users that the search finds: only for an instance admin. */
  otherWorkspaces: readonly CommandWorkspace[];
  /** What the server search found with the text of the bar. Unset: no search for this kind. */
  jobs?: readonly CommandJob[];
  triggers?: readonly CommandTrigger[];
  /** The secrets of each project that the reader can read: names only. */
  workspaceSecrets?: readonly CommandSecret[];
  /** Only for a person who can list the users of the instance. */
  users?: readonly CommandUser[];
  packages?: readonly CommandPackage[];
}

/** What the rows of the server search can do, beside their page. */
export interface CommandRowActions {
  rerunJob: (job: { jobId: string; pipelineId: string; projectId: string }) => Promise<unknown>;
  setTriggerEnabled: (trigger: {
    triggerId: string;
    pipelineId: string;
    enabled: boolean;
  }) => Promise<unknown>;
  copyName: (name: string) => Promise<void>;
}

export interface RowsInput extends CommandSourcesData {
  links: readonly AppNavLink[];
  commands: readonly CommandDefinition[];
  slug?: string;
  workspaceId: string | null;
  /** The name of the workspace: the place of a member. */
  workspaceName?: string | null;
  project: { id: string | null; name: string | null };
  /** The pipeline in the URL. */
  pipelineId?: string;
  /** The text of the search, with no filter prefix. */
  search?: string;
  can: (permission: Permission, target?: PermissionTarget) => boolean;
  /** The text of a message in the other language. */
  other: (message: MessageDescriptor | undefined) => string | undefined;
  /** Unset: the rows of the server search have no action. */
  actions?: CommandRowActions;
  /** The clock of the relative times. Unset: now. */
  now?: number;
}

export interface Draft extends Omit<CommandRow, 'sentence' | 'fields'> {
  say: (label: string) => MessageDescriptor;
  /** The id of the entity: the row with the same name, type and place shows its start. */
  uid?: string;
  keywords?: readonly (string | undefined)[];
  /** Other words of the place, which do not show. */
  searchPlace?: readonly (string | undefined)[];
}

/**
 * A row of the server search in the recent list: the bar opens with no text, so no search gives it
 * again. Only what shows and the page: a row that acts goes there as its page.
 */
export interface RecentRow {
  id: string;
  group: CommandGroupId;
  name: string;
  place?: string;
  href: string;
  look?: Extract<RowLook, { kind: 'status' | IdentityKind }>;
}
