import type { Snippet } from 'svelte';
import { renderSnippet } from '@tanstack/svelte-table';
import type { DataTableColumn } from '@scylla/ui';
import { t } from '@scylla/ui/i18n';
import type { JobEntity } from '@base/features/jobs/domain/entities/job.entity.ts';
import { jobsMessages } from '@base/features/jobs/presentation/messages/jobs.messages.ts';

export interface JobCells {
  status: Snippet<[JobEntity]>;
  id: Snippet<[JobEntity]>;
  timeline: Snippet<[JobEntity]>;
  duration: Snippet<[JobEntity]>;
  created: Snippet<[JobEntity]>;
  actions: Snippet<[JobEntity]>;
}

export const jobColumns = (cells: JobCells): DataTableColumn<JobEntity>[] => [
  {
    accessorKey: 'status',
    header: t(jobsMessages.status),
    cell: ({ row }) => renderSnippet(cells.status, row.original),
    size: 200,
    minSize: 150,
    meta: { card: 'title' },
  },
  {
    accessorKey: 'id',
    header: t(jobsMessages.jobId),
    cell: ({ row }) => renderSnippet(cells.id, row.original),
    size: 200,
    minSize: 180,
    meta: { card: 'title' },
  },
  {
    id: 'timeline',
    header: t(jobsMessages.timeline),
    cell: ({ row }) => renderSnippet(cells.timeline, row.original),
    // No size: takes the space left, down to 200px.
    minSize: 200,
    meta: { card: 'body' },
  },
  {
    id: 'duration',
    header: t(jobsMessages.duration),
    cell: ({ row }) => renderSnippet(cells.duration, row.original),
    size: 100,
    minSize: 80,
    meta: { card: 'meta' },
  },
  {
    accessorKey: 'createdAt',
    header: t(jobsMessages.created),
    cell: ({ row }) => renderSnippet(cells.created, row.original),
    size: 100,
    minSize: 80,
    meta: { card: 'meta' },
  },
  {
    id: 'actions',
    header: t(jobsMessages.actions),
    cell: ({ row }) => renderSnippet(cells.actions, row.original),
    minSize: 100,
    size: 130,
    meta: { card: 'actions' },
  },
];
