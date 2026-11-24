import type { Snippet } from 'svelte';
import { renderSnippet } from '@tanstack/svelte-table';
import type { DataTableColumn } from '@scylla/ui';
import { t } from '@scylla/ui/i18n';
import type { UserEntity } from '@base/features/user/domain/entities/user.entity.ts';
import { userMessages } from '@base/features/user/presentation/messages/user.messages.ts';

export interface UserCells {
  identity: Snippet<[UserEntity]>;
  roles: Snippet<[UserEntity]>;
  workspaces: Snippet<[UserEntity]>;
  lastSignIn: Snippet<[UserEntity]>;
  actions: Snippet<[UserEntity]>;
}

export const userColumns = (cells: UserCells): DataTableColumn<UserEntity>[] => [
  {
    id: 'identity',
    header: t(userMessages.user),
    cell: ({ row }) => renderSnippet(cells.identity, row.original),
    size: 300,
    minSize: 220,
    meta: { align: 'left', card: 'title' },
  },
  {
    id: 'roles',
    header: t(userMessages.instanceRoles),
    cell: ({ row }) => renderSnippet(cells.roles, row.original),
    size: 220,
    minSize: 150,
    meta: { align: 'left' },
  },
  {
    id: 'workspaces',
    header: t(userMessages.workspaces),
    cell: ({ row }) => renderSnippet(cells.workspaces, row.original),
    size: 180,
    minSize: 120,
    meta: { align: 'left' },
  },
  {
    id: 'lastSignIn',
    header: t(userMessages.lastSignIn),
    cell: ({ row }) => renderSnippet(cells.lastSignIn, row.original),
    size: 130,
    minSize: 100,
    meta: { align: 'left', card: 'meta' },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => renderSnippet(cells.actions, row.original),
    size: 60,
    meta: { align: 'center', card: 'actions' },
  },
];
