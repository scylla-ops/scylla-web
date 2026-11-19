<script lang="ts">
  import RotateCwIcon from '@lucide/svelte/icons/rotate-cw';
  import { Button } from '../../primitives/index.ts';
  import { t } from '../../i18n/lingui.adapter.svelte.ts';
  import { cn } from '../../utils/index.ts';
  import type { WidgetSize } from '../widget-size.ts';
  import type { WidgetStateAction, WidgetStateKind } from './widget-state.ts';
  import { widgetStateMessages } from './widget-state.messages.ts';
  import { WIDGET_STATE_APPEARANCES } from './widget-state.registry.ts';
  import WidgetStateSkeleton from './WidgetStateSkeleton.svelte';

  interface Props {
    state: WidgetStateKind;
    size: WidgetSize;
    /** Replaces the generic title of the state. */
    title?: string;
    /** Replaces the generic description of the state. */
    description?: string;
    /** Not shown in the size `xs`: the widget has no room for it. */
    action?: WidgetStateAction;
    /** `error`: the seconds until the next read. The description says when the widget tries again. */
    retrySeconds?: number;
    /** `locked`: the name of the permission that the person does not have. The description names it. */
    permission?: string;
    class?: string;
  }

  let { state, size, title, description, action, retrySeconds, permission, class: className }: Props = $props();

  const fallback = $derived(
    state === 'error' && retrySeconds !== undefined
      ? t(widgetStateMessages.errorRetryIn(retrySeconds))
      : state === 'locked' && permission
        ? t(widgetStateMessages.lockedNeeds(permission))
        : undefined,
  );

  const compact = $derived(size === 'xs');
</script>

{#if state === 'loading'}
  <div
    role="status"
    data-slot="widget-state"
    data-state={state}
    class={cn('flex min-h-0 flex-1 flex-col', className)}
  >
    <span class="sr-only">{t(widgetStateMessages.loading)}</span>
    <WidgetStateSkeleton {size} />
  </div>
{:else}
  {@const appearance = WIDGET_STATE_APPEARANCES[state]}
  {@const Icon = appearance.icon}
  <div
    data-slot="widget-state"
    data-state={state}
    class={cn(
      'flex min-h-0 min-w-0 flex-1',
      compact ? 'items-center gap-2.5' : 'flex-col items-center justify-center gap-1 text-center',
      className,
    )}
  >
    <span
      aria-hidden="true"
      class={cn(
        'flex shrink-0 items-center justify-center rounded-full',
        compact ? 'size-6' : 'mb-1 size-8',
        appearance.tone,
      )}
    >
      <Icon class={compact ? 'size-3.5' : 'size-4'} />
    </span>
    <div class={cn('min-w-0', compact ? 'flex flex-col' : 'flex max-w-72 flex-col items-center')}>
      <p class={cn('font-medium', compact ? 'truncate text-xs' : 'font-display text-[15px]')}>
        {title ?? t(appearance.title)}
      </p>
      <p class={cn('text-xs text-muted-foreground', compact ? 'truncate' : 'line-clamp-3')}>
        {description ?? fallback ?? t(appearance.description)}
      </p>
    </div>
    {#if action && !compact}
      <Button variant="outline" size="xs" class="mt-2" onclick={action.onSelect}>
        <RotateCwIcon aria-hidden="true" />
        {action.label}
      </Button>
    {/if}
  </div>
{/if}
