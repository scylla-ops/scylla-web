import CalendarClockIcon from '@lucide/svelte/icons/calendar-clock';
import GitCommitHorizontalIcon from '@lucide/svelte/icons/git-commit-horizontal';
import GitPullRequestIcon from '@lucide/svelte/icons/git-pull-request';
import HelpCircleIcon from '@lucide/svelte/icons/help-circle';
import TagIcon from '@lucide/svelte/icons/tag';
import WebhookIcon from '@lucide/svelte/icons/webhook';
import type { TriggerKind } from '@base/features/triggers/domain/entities/trigger.entity.ts';

/** The icon of each kind of trigger, in the list and in the type picker. */
export const KIND_ICONS = {
  cron: CalendarClockIcon,
  webhook: WebhookIcon,
  push: GitCommitHorizontalIcon,
  pullRequest: GitPullRequestIcon,
  tag: TagIcon,
  unknown: HelpCircleIcon,
} as const satisfies Record<TriggerKind, unknown>;
