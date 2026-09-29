<script lang="ts">
  import { fade, fly, slide } from 'svelte/transition';
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import { motionDuration } from '@scylla/ui';
  import { Button } from '@scylla/ui/shadcn';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { onboardingMessages } from '../onboarding.messages.ts';
  import type { TourLink } from '../tour-steps.ts';
  import { holdPointer } from '../tour-tracking.actions.ts';

  interface Props {
    title?: string;
    body: readonly string[];
    link?: TourLink;
    waiting?: string;
    hint?: { body: readonly string[]; link?: TourLink };
    notice?: { text: string; action?: { label: string; onClick: () => void } };
    count?: { step: number; total: number } | null;
    controls?: { showNext: boolean; canGoNext: boolean; onNext: () => void; onSkip: () => void };
    wide?: boolean;
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
    controls,
    wide = false,
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
    class="text-[13px] font-semibold text-primary hover:underline"
  >
    {t(target.label)}
  </a>
{/snippet}

<div
  use:holdPointer
  bind:offsetWidth={width}
  bind:offsetHeight={height}
  in:fly={{ y: 8, duration: motionDuration(250) }}
  out:fade={{ duration: motionDuration(150) }}
  role="dialog"
  aria-label={title ?? body[0]}
  tabindex="-1"
  data-tour-focus
  class={cn(
    'pointer-events-auto fixed z-[60] flex flex-col gap-3 rounded-[14px] border border-border bg-background px-[22px] pt-4 pb-3.5 text-foreground shadow-xl outline-none transition-[width] duration-300 ease-out motion-reduce:transition-none',
    wide ? 'w-[400px]' : 'w-[360px]',
    'max-w-[calc(100vw-2rem)]',
  )}
  style:left="{x}px"
  style:top="{y}px"
  style:visibility={height > 0 ? 'visible' : 'hidden'}
>
  {#if title}
    <p class="text-base font-semibold">
      {#if count}{count.step}.{/if}
      {title}
    </p>
  {/if}
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
  {#if controls}
    <div class="flex items-center gap-2">
      {#if count}
        <span class="text-xs text-muted-foreground">
          {t(onboardingMessages.stepCount(count.step, count.total))}
        </span>
      {/if}
      <span class="flex-1"></span>
      <button
        type="button"
        onclick={controls.onSkip}
        class="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        {t(onboardingMessages.skipTour)}
      </button>
      {#if controls.showNext}
        <Button
          size="sm"
          class="h-[30px] rounded-lg px-3.5 text-[13px] font-semibold"
          disabled={!controls.canGoNext}
          onclick={controls.onNext}
        >
          {t(onboardingMessages.next)}
        </Button>
      {/if}
    </div>
  {/if}
</div>
