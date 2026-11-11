import type { Snippet } from 'svelte';
import { renderSnippet } from '@tanstack/svelte-table';
import type { DataTableColumn } from '@scylla/ui';
import { t } from '@scylla/ui/i18n';
import type { VcsConnectionEntity } from '@base/features/integrations/domain/entities/vcs-connection.entity.ts';
import { integrationsMessages as messages } from '@base/features/integrations/presentation/messages/integrations.messages.ts';

export interface ConnectionCells {
  account: Snippet<[VcsConnectionEntity]>;
  repositories: Snippet<[VcsConnectionEntity]>;
  events: Snippet<[VcsConnectionEntity]>;
  state: Snippet<[VcsConnectionEntity]>;
  actions: Snippet<[VcsConnectionEntity]>;
}

export const connectionColumns = (
  cells: ConnectionCells,
): DataTableColumn<VcsConnectionEntity>[] => [
  {
    id: 'account',
    header: t(messages.account),
    cell: ({ row }) => renderSnippet(cells.account, row.original),
    size: 280,
    minSize: 220,
    meta: { align: 'left', card: 'title' },
  },
  {
    id: 'repositories',
    header: t(messages.repositories),
    cell: ({ row }) => renderSnippet(cells.repositories, row.original),
    size: 150,
    minSize: 130,
    meta: { align: 'left', card: 'meta' },
  },
  {
    id: 'events',
    header: t(messages.events),
    cell: ({ row }) => renderSnippet(cells.events, row.original),
    size: 170,
    minSize: 150,
    meta: { align: 'left', card: 'meta' },
  },
  {
    id: 'state',
    header: t(messages.state),
    cell: ({ row }) => renderSnippet(cells.state, row.original),
    size: 260,
    minSize: 200,
    meta: { align: 'left', card: 'body' },
  },
  {
    id: 'actions',
    header: t(messages.actionsHeader),
    cell: ({ row }) => renderSnippet(cells.actions, row.original),
    size: 64,
    minSize: 64,
    meta: { align: 'center', card: 'actions' },
  },
];
