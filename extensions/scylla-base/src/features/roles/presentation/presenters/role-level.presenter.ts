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

/** The marks of a chosen level: the border and tint of a card, the line and count of a tab. */
export const LEVEL_TONES: Record<
  RoleLevel,
  { border: string; tint: string; bar: string; count: string }
> = {
  platform: {
    border: 'border-status-skipped',
    tint: 'bg-status-skipped/7',
    bar: 'bg-status-skipped',
    count: 'bg-status-skipped/18',
  },
  workspace: { border: 'border-info', tint: 'bg-info/7', bar: 'bg-info', count: 'bg-info/18' },
  project: {
    border: 'border-warning',
    tint: 'bg-warning/7',
    bar: 'bg-warning',
    count: 'bg-warning/18',
  },
};
