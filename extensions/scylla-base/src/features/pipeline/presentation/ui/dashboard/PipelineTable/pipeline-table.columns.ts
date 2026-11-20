import type { Snippet } from 'svelte';
import { renderSnippet } from '@tanstack/svelte-table';
import type { DataTableColumn } from '@scylla/ui';
import { t } from '@scylla/ui/i18n';
import type { PipelineMetadata } from '@base/features/pipeline/domain/entities/pipeline.entity.ts';
import { pipelineMessages } from '@base/features/pipeline/presentation/messages/pipeline.messages.ts';

export interface PipelineCells {
  status: Snippet<[PipelineMetadata]>;
  history: Snippet<[PipelineMetadata]>;
  actions: Snippet<[PipelineMetadata]>;
}

/** Rows of 80 px: the 64 px status icon and `py-2`. */
export const pipelineColumns = (cells: PipelineCells): DataTableColumn<PipelineMetadata>[] => [
  {
    id: 'status',
    header: t(pipelineMessages.status),
    cell: ({ row }) => renderSnippet(cells.status, row.original),
    // The icon (64), the gap (12) and the text (156), in pl-2 pr-3.
    size: 252,
    minSize: 252,
    meta: { card: 'title', class: 'py-2 pr-3 pl-2' },
  },
  {
    id: 'history',
    header: t(pipelineMessages.history),
    cell: ({ row }) => renderSnippet(cells.history, row.original),
    // No size: takes the space left, down to 180px.
    minSize: 180,
    meta: { card: 'body', class: 'px-3 py-2' },
  },
  {
    id: 'actions',
    header: t(pipelineMessages.actions),
    cell: ({ row }) => renderSnippet(cells.actions, row.original),
    // Five buttons of 32, 8 apart, in pl-2 pr-4.
    size: 216,
    minSize: 80,
    meta: { card: 'actions', class: 'py-2 pr-4 pl-2' },
  },
];
