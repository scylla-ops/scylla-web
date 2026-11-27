import type { Snippet } from 'svelte';
import { renderSnippet } from '@tanstack/svelte-table';
import type { DataTableColumn } from '@scylla/ui';
import { t } from '@scylla/ui/i18n';
import type { WorkspaceEntity } from '@base/features/workspace/domain/entities/workspace.entity.ts';
import { workspaceAdminMessages as messages } from '@base/features/workspace/presentation/messages/workspace-admin.messages.ts';

export interface WorkspaceCells {
  name: Snippet<[WorkspaceEntity]>;
  owner: Snippet<[WorkspaceEntity]>;
  members: Snippet<[WorkspaceEntity]>;
  projects: Snippet<[WorkspaceEntity]>;
  created: Snippet<[WorkspaceEntity]>;
  lastActivity: Snippet<[WorkspaceEntity]>;
}

/** On a phone, a card: the name on top, the owner under it, the facts on the last line. */
export const workspaceColumns = (cells: WorkspaceCells): DataTableColumn<WorkspaceEntity>[] => [
  {
    id: 'name',
    header: t(messages.workspace),
    cell: ({ row }) => renderSnippet(cells.name, row.original),
    size: 200,
    minSize: 120,
    meta: { align: 'left', card: 'title' },
  },
  {
    id: 'owner',
    header: t(messages.owner),
    cell: ({ row }) => renderSnippet(cells.owner, row.original),
    size: 240,
    minSize: 180,
    meta: { align: 'left', card: 'body' },
  },
  {
    id: 'members',
    header: t(messages.members),
    cell: ({ row }) => renderSnippet(cells.members, row.original),
    size: 90,
    minSize: 72,
    meta: { align: 'center', card: 'meta' },
  },
  {
    id: 'projects',
    header: t(messages.projects),
    cell: ({ row }) => renderSnippet(cells.projects, row.original),
    size: 90,
    minSize: 72,
    meta: { align: 'center', card: 'meta' },
  },
  {
    id: 'created',
    header: t(messages.created),
    cell: ({ row }) => renderSnippet(cells.created, row.original),
    size: 130,
    minSize: 108,
    meta: { align: 'left', card: 'meta' },
  },
  {
    id: 'lastActivity',
    header: t(messages.lastActivity),
    cell: ({ row }) => renderSnippet(cells.lastActivity, row.original),
    size: 120,
    minSize: 96,
    meta: { align: 'left', card: 'meta' },
  },
];
