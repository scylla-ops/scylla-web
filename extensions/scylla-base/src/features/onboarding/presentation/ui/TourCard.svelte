<script lang="ts">
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
    count,
    controls,
    wide = false,
    x,
    y,
    width = $bindable(0),
    height = $bindable(0),
  }: Props = $props();
</script>

<div
  use:holdPointer
  bind:offsetWidth={width}
  bind:offsetHeight={height}
  role="dialog"
  aria-label={title ?? body[0]}
  class={cn(
    'pointer-events-auto fixed z-[60] flex flex-col gap-3 rounded-[14px] border border-border bg-background px-[22px] pt-4 pb-3.5 text-foreground shadow-xl transition-[left,top] duration-200 ease-out',
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
  {#if link}
    <a
      href={link.href}
      target="_blank"
      rel="noreferrer"
      class="text-[13px] font-semibold text-primary hover:underline"
    >
      {t(link.label)}
    </a>
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
