import { matchesSearch } from '@scylla/ui/utils';
import type { RoleEntity, RoleHolder, RoleLevel } from '../../domain/entities/role.entity.ts';
import { roleName } from '../role-labels.ts';

const LEVELS: readonly RoleLevel[] = ['platform', 'workspace', 'project'];

export interface CopyTarget {
  /** Absent: a new role. */
  role?: Pick<RoleEntity, 'key' | 'holderCount'>;
  holder: RoleHolder;
  level: RoleLevel;
  /** The levels that this page can make. */
  levels: readonly RoleLevel[];
}

/**
 * The roles that a copy can start from. A copy takes the level and the holder of the role, and a
 * saved role keeps its holder, and its level while someone holds it.
 */
export const copySources = (roles: readonly RoleEntity[], target: CopyTarget): RoleEntity[] =>
  roles.filter(source => {
    if (!target.levels.includes(source.level)) return false;
    if (!target.role) return true;
    return (
      source.key !== target.role.key &&
      source.holder === target.holder &&
      (target.role.holderCount === 0 || source.level === target.level)
    );
  });

export interface CopyGroup {
  level: RoleLevel;
  roles: RoleEntity[];
}

/** The roles by level, in the order of the levels. A group with no role is left out. */
export const copyGroups = (roles: readonly RoleEntity[], search: string): CopyGroup[] =>
  LEVELS.map(level => ({
    level,
    roles: roles.filter(
      role => role.level === level && matchesSearch(search, [roleName(role), role.name]),
    ),
  })).filter(group => group.roles.length > 0);
