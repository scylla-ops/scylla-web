import type { Snippet } from 'svelte';
import { renderSnippet } from '@tanstack/svelte-table';
import type { DataTableColumn } from '@scylla/ui';
import { t } from '@scylla/ui/i18n';
import type { UserEntity } from '../../../../domain/entities/user.entity.ts';
import { userMessages } from '../../user.messages.ts';

export interface UserCells {
  identity: Snippet<[UserEntity]>;
  status: Snippet<[UserEntity]>;
  creationDate: Snippet<[UserEntity]>;
  actions: Snippet<[UserEntity]>;
}

export const userColumns = (cells: UserCells): DataTableColumn<UserEntity>[] => [
  {
    id: 'identity',
    header: t(userMessages.user),
    cell: ({ row }) => renderSnippet(cells.identity, row.original),
    size: 280,
    minSize: 220,
    meta: { align: 'left' },
  },
  {
    id: 'status',
    header: t(userMessages.status),
    cell: ({ row }) => renderSnippet(cells.status, row.original),
    size: 140,
    minSize: 110,
    meta: { align: 'center' },
  },
  {
    id: 'creationDate',
    header: t(userMessages.createdAt),
    cell: ({ row }) => renderSnippet(cells.creationDate, row.original),
    size: 250,
    minSize: 150,
    meta: { align: 'center' },
  },
  {
    id: 'actions',
    header: t(userMessages.actions),
    cell: ({ row }) => renderSnippet(cells.actions, row.original),
    // No minSize: the first column to shrink on a narrow screen.
    size: 100,
    meta: { align: 'center' },
  },
];
