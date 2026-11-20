import type { MessageDescriptor } from '@lingui/core';
import type { SearchSelectOption } from '@scylla/ui';
import { t } from '@scylla/ui/i18n';
import type { JobEvent } from '@base/features/jobs';
import type { GitRef } from '@base/features/integrations';
import { runMessages } from '../messages/run.messages.ts';

const EVENT_LABELS: Record<JobEvent, MessageDescriptor> = {
  push: runMessages.eventPush,
  pull_request: runMessages.eventPullRequest,
  tag: runMessages.eventTag,
  manual: runMessages.eventManual,
  provider_rerun: runMessages.eventProviderRerun,
  trigger: runMessages.eventTrigger,
};

/** In the order of the proto. */
export const JOB_EVENTS = Object.keys(EVENT_LABELS) as JobEvent[];

export const jobEventLabel = (event: JobEvent): string => t(EVENT_LABELS[event]);

/** The row that removes the branch filter. A branch name never has `*`. */
export const ALL_BRANCHES = '*';

/** All the branches, then the branches of the repository, the default branch first. */
export const branchFilterOptions = (refs: readonly GitRef[]): SearchSelectOption[] => [
  { value: ALL_BRANCHES, label: t(runMessages.allBranches) },
  ...refs
    .filter(ref => ref.kind === 'branch')
    .sort((a, b) => Number(b.defaultBranch) - Number(a.defaultBranch))
    .map(ref => ({ value: ref.name, label: ref.name })),
];
