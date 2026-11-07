<script lang="ts">
  import { fade, fly, slide } from 'svelte/transition';
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import { motionDuration } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import {
    onboardingMessages,
  } from '@base/features/onboarding/presentation/messages/onboarding.messages.ts';
  import type { TourLink } from './tour-steps.registry.ts';
  import { holdPointer } from './tour-tracking.attachments.svelte.ts';

  interface Props {
    title: string;
    body: readonly string[];
    link?: TourLink;
    waiting?: string;
    hint?: { body: readonly string[]; link?: TourLink };
    notice?: { text: string; action?: { label: string; onClick: () => void } };
    count?: { step: number; total: number } | null;
    onSkip: () => void;
    onPrevious?: () => void;
    primary?: { label: string; disabled: boolean; onClick: () => void };
    wide?: boolean;
    /** Kept in place but not shown, e.g. under the skip confirmation. */
    hidden?: boolean;
    /** The card glides to its new place while the ring moves to the next step. */
    gliding?: boolean;
    x: number;
    y: number;
    width?: number;
    height?: number;
  }

  let {
    title,
    body,
    link,
    waiting,
    hint,
    notice,
    count,
    onSkip,
    onPrevious,
    primary,
    wide = false,
    hidden = false,
    gliding = false,
    x,
    y,
    width = $bindable(0),
    height = $bindable(0),
  }: Props = $props();
</script>

{#snippet docsLink(target: TourLink)}
  <a
    href={target.href}
    target="_blank"
    rel="noreferrer"
    class="self-start text-[13px] font-semibold text-primary hover:underline"
  >
    {t(target.label)}
  </a>
{/snippet}

<div
  {@attach holdPointer}
  bind:offsetWidth={width}
  bind:offsetHeight={height}
  in:fly={{ y: 8, duration: motionDuration(250) }}
  out:fade={{ duration: motionDuration(150) }}
  role="dialog"
  aria-label={title}
  tabindex="-1"
  data-tour-focus
  class={cn(
    'pointer-events-auto fixed z-[200] flex flex-col gap-3 rounded-[14px] border border-border bg-background px-5 pt-4 pb-4 text-foreground shadow-xl outline-none duration-300 ease-out motion-reduce:transition-none',
    gliding ? 'transition-[left,top,width]' : 'transition-[width]',
    wide ? 'w-[400px]' : 'w-[380px]',
    'max-w-[calc(100vw-2rem)]',
  )}
  style:left="{x}px"
  style:top="{y}px"
  style:visibility={!hidden && height > 0 ? 'visible' : 'hidden'}
  style:opacity={hidden ? 0 : undefined}
>
  <div class="flex items-center gap-2">
    <h2 class="text-base leading-tight">{title}</h2>
    {#if count}
      <span
        class="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-primary"
        data-tour-count
      >
        {t(onboardingMessages.stepCount(count.step, count.total))}
      </span>
    {/if}
    <span class="flex-1"></span>
    <button
      type="button"
      onclick={onSkip}
      class="shrink-0 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
    >
      {t(onboardingMessages.skip)}
    </button>
  </div>
  {#each body as paragraph, index (index)}
    <p class="text-[13px] leading-snug text-muted-foreground">{paragraph}</p>
  {/each}
  {#if waiting}
    <p class="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span class="size-1.5 animate-pulse rounded-full bg-muted-foreground"></span>
      {waiting}
    </p>
  {/if}
  {#if link}{@render docsLink(link)}{/if}
  {#if hint}
    <div class="flex flex-col gap-3" transition:slide={{ duration: motionDuration(200) }}>
      {#each hint.body as paragraph, index (index)}
        <p class="text-[13px] leading-snug text-muted-foreground">{paragraph}</p>
      {/each}
      {#if hint.link}{@render docsLink(hint.link)}{/if}
    </div>
  {/if}
  {#if notice}
    <div
      role="status"
      class="flex flex-col gap-2 rounded-lg border border-warning/40 bg-warning/10 p-2.5"
      transition:slide={{ duration: motionDuration(200) }}
    >
      <p class="flex gap-2 text-[13px] leading-snug text-foreground">
        <TriangleAlertIcon class="mt-0.5 size-4 shrink-0 text-warning" />
        {notice.text}
      </p>
      {#if notice.action}
        <Button variant="outline" size="sm" class="self-start" onclick={notice.action.onClick}>
          {notice.action.label}
        </Button>
      {/if}
    </div>
  {/if}
  {#if onPrevious || primary || count}
    <div class="flex items-center gap-2 pt-1">
      <Button
        variant="outline"
        size="sm"
        class="h-[30px] rounded-lg px-3 text-[13px]"
        disabled={!onPrevious}
        onclick={onPrevious}
      >
        {t(onboardingMessages.previous)}
      </Button>
      <span class="flex-1"></span>
      {#if primary}
        <Button
          size="sm"
          class="h-[30px] rounded-lg px-3.5 text-[13px] font-semibold"
          disabled={primary.disabled}
          onclick={primary.onClick}
        >
          {primary.label}
        </Button>
      {/if}
    </div>
  {/if}
</div>
