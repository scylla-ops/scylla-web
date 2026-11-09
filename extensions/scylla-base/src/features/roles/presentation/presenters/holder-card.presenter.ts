import Building2Icon from '@lucide/svelte/icons/building-2';
import FolderIcon from '@lucide/svelte/icons/folder';
import ServerIcon from '@lucide/svelte/icons/server';
import type { MessageDescriptor } from '@lingui/core';
import { workspaceUrl } from '@platform/context';
import type { LucideIcon } from '@scylla/ui';
import { t } from '@scylla/ui/i18n';
import {
  identityKindOf,
  type IdentityKind,
} from '@shared/presentation/presenters/user-identity.presenter.ts';
import type { RoleHolderEntry, RoleHolders, RoleLevel } from '../../domain/entities/role.entity.ts';
import {
  agentsCount,
  appsCount,
  levelLabels,
  peopleCount,
  projectsCount,
  workspacesCount,
} from '../messages/roles.messages.ts';

export interface HolderCardRow {
  actorId: string;
  displayName: string;
  handle: string;
  kind: IdentityKind;
  scopeIcon: LucideIcon;
  /** The workspace, the project, or "3 projects". */
  scope: string;
  /** Absent: the actor has no page in this list of people. */
  href?: string;
}

export interface HolderCard {
  /** "4 people · 2 agents · 1 app". */
  heading: string;
  rows: HolderCardRow[];
  /** The holders that have no row. */
  more: number;
  /** "See all members". Absent: the reader cannot open the page of the people. */
  allHref?: string;
}

/** Where the people of the list are. Absent for a reader who cannot open their page. */
export interface HolderPages {
  slug: string;
  /** Absent: the instance, whose people are its users. */
  workspaceId?: string;
}

/** A grant on a workspace covers its projects: the widest scope tells where an actor holds the role. */
const WIDEST_FIRST: RoleLevel[] = ['platform', 'workspace', 'project'];

const SCOPE_ICONS: Record<RoleLevel, LucideIcon> = {
  platform: ServerIcon,
  workspace: Building2Icon,
  project: FolderIcon,
};

const KIND_COUNTS: [IdentityKind, (count: number) => MessageDescriptor][] = [
  ['person', peopleCount],
  ['agent', agentsCount],
  ['app', appsCount],
];

const scopeOf = (grants: RoleHolderEntry[]): Pick<HolderCardRow, 'scopeIcon' | 'scope'> => {
  const level =
    WIDEST_FIRST.find(one => grants.some(grant => grant.scopeKind === one)) ?? 'project';
  const names = new Map(
    grants
      .filter(grant => grant.scopeKind === level)
      .map(grant => [grant.scopeId, grant.scopeName]),
  );
  const scope =
    level === 'platform'
      ? t(levelLabels.platform)
      : names.size === 1
        ? [...names.values()][0]
        : t(level === 'workspace' ? workspacesCount(names.size) : projectsCount(names.size));
  return { scopeIcon: SCOPE_ICONS[level], scope };
};

/**
 * The card of the holders of a role, in the order of the stack of avatars. The people of a
 * workspace are its members, apps also. The people of the instance are its users: an app has no
 * page there.
 */
export const holderCard = (
  { holders, total }: RoleHolders,
  pages?: HolderPages,
  max = 6,
): HolderCard => {
  const allHref =
    pages && workspaceUrl(pages.slug, pages.workspaceId ? 'access/members' : 'instance/users');
  const grants = new Map<string, RoleHolderEntry[]>();
  for (const holder of holders) {
    grants.set(holder.actorId, [...(grants.get(holder.actorId) ?? []), holder]);
  }
  const actors = [...grants.values()].map(own => {
    const [first] = own;
    const kind = identityKindOf(first);
    return {
      actorId: first.actorId,
      displayName: first.displayName,
      handle: first.handle,
      kind,
      ...scopeOf(own),
      href:
        allHref && (pages?.workspaceId || kind === 'person')
          ? `${allHref}/${encodeURIComponent(first.actorId)}`
          : undefined,
    };
  });
  const heading = KIND_COUNTS.map(([kind, label]) => ({
    count: actors.filter(actor => actor.kind === kind).length,
    label,
  }))
    .filter(({ count }) => count > 0)
    .map(({ count, label }) => t(label(count)))
    .join(' · ');
  const rows = actors.slice(0, max);
  return {
    heading,
    rows,
    more: actors.length - rows.length + Math.max(0, total - holders.length),
    allHref,
  };
};
