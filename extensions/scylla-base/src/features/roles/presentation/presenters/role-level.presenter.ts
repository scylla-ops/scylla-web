import FolderIcon from '@lucide/svelte/icons/folder';
import ServerIcon from '@lucide/svelte/icons/server';
import UsersRoundIcon from '@lucide/svelte/icons/users-round';
import type { LucideIcon } from '@scylla/ui';
import type { RoleLevel } from '../../domain/entities/role.entity.ts';

/** The level is told by colour and icon together, never by colour alone. */
export const LEVEL_APPEARANCES: Record<RoleLevel, { icon: LucideIcon; tile: string }> = {
  platform: { icon: ServerIcon, tile: 'bg-status-skipped/16 text-status-skipped' },
  workspace: { icon: UsersRoundIcon, tile: 'bg-info/16 text-info' },
  project: { icon: FolderIcon, tile: 'bg-warning/16 text-warning' },
};
