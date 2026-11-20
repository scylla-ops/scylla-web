import type { RoleEntity } from '../../domain/entities/role.entity.ts';

export const ROLE_FILTERS = ['all', 'platform', 'workspace', 'project', 'machines'] as const;

export type RoleFilter = (typeof ROLE_FILTERS)[number];

export type RoleGroupId = Exclude<RoleFilter, 'all'>;

export interface RoleGroup {
  id: RoleGroupId;
  roles: RoleEntity[];
}

const groupOf = (role: RoleEntity): RoleGroupId =>
  role.holder === 'apps' ? 'machines' : role.level;

const matches = (role: RoleEntity, search: string): boolean =>
  role.name.toLowerCase().includes(search) || role.description.toLowerCase().includes(search);

export type RoleSort = 'none' | 'asc' | 'desc';

const NEXT_SORT: Record<RoleSort, RoleSort> = { none: 'asc', asc: 'desc', desc: 'none' };

/** A click on the header: A → Z, then Z → A, then the order of the server. */
export const nextSort = (sort: RoleSort): RoleSort => NEXT_SORT[sort];

const BY_NAME = new Intl.Collator(undefined, { sensitivity: 'base' });

export const sortRoles = <T>(
  roles: readonly T[],
  sort: RoleSort,
  name: (role: T) => string,
): T[] => {
  if (sort === 'none') return [...roles];
  const sign = sort === 'asc' ? 1 : -1;
  return [...roles].sort((a, b) => sign * BY_NAME.compare(name(a), name(b)));
};

/** The groups in the order of the page. A group with no role is left out. */
export const groupRoles = (
  roles: readonly RoleEntity[],
  filter: RoleFilter,
  search: string,
): RoleGroup[] => {
  const text = search.trim().toLowerCase();
  const kept = roles.filter(role => !text || matches(role, text));
  const order: RoleGroupId[] = ['platform', 'workspace', 'project', 'machines'];
  return order
    .filter(id => filter === 'all' || filter === id)
    .map(id => ({ id, roles: kept.filter(role => groupOf(role) === id) }))
    .filter(group => group.roles.length > 0);
};
