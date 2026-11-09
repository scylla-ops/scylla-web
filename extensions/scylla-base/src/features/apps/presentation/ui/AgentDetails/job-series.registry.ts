import type { MessageDescriptor } from '@lingui/core';
import type { JobOutcomes } from '@base/features/apps/domain/structs/agent-stats.struct.ts';
import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';

export interface JobSeries {
  key: keyof JobOutcomes;
  color: string;
  label: MessageDescriptor;
}

/** The ends of the jobs in a stacked bar, from the bottom. */
export const JOB_SERIES: readonly JobSeries[] = [
  { key: 'completed', color: 'bg-success', label: messages.completed },
  { key: 'failed', color: 'bg-destructive', label: messages.failed },
  { key: 'cancelled', color: 'bg-muted-foreground', label: messages.cancelled },
  { key: 'orphaned', color: 'bg-status-skipped', label: messages.orphaned },
];
