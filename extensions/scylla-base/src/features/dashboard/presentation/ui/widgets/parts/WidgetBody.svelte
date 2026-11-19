<script lang="ts">
  import type { Snippet } from 'svelte';
  import { WidgetState, type WidgetSize } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { widgetMessages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';

  interface Props {
    size: WidgetSize;
    locked?: boolean;
    /** The first load only: a refresh keeps the data on screen. */
    loading?: boolean;
    error?: boolean;
    onRetry?: () => void;
    /** The seconds between two reads of the data: the error says when the widget tries again. */
    retrySeconds?: number;
    /** The read permission that a locked widget needs. */
    permission?: string;
    empty?: boolean;
    /** `all-clear` is a good state, not an empty one. */
    emptyKind?: 'empty' | 'all-clear';
    emptyTitle?: string;
    emptyText?: string;
    children: Snippet;
  }

  let {
    size,
    locked = false,
    loading = false,
    error = false,
    onRetry,
    retrySeconds,
    permission,
    empty = false,
    emptyKind = 'empty',
    emptyTitle,
    emptyText,
    children,
  }: Props = $props();
</script>

{#if locked}
  <WidgetState state="locked" {size} {permission} description={permission ? undefined : t(widgetMessages.locked)} />
{:else if loading}
  <WidgetState state="loading" {size} />
{:else if error}
  <WidgetState
    state="error"
    {size}
    {retrySeconds}
    action={onRetry ? { label: t(widgetMessages.retry), onSelect: onRetry } : undefined}
  />
{:else if empty}
  <WidgetState state={emptyKind} {size} title={emptyTitle} description={emptyText} />
{:else}
  {@render children()}
{/if}
