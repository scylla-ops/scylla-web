<script lang="ts">
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import {
    onboardingMessages as m,
  } from '@base/features/onboarding/presentation/messages/onboarding.messages.ts';
  import TourIcon from './TourIcon.svelte';
  import type { TourDefinition } from './tour-steps.registry.ts';

  interface Props {
    tours: readonly TourDefinition[];
    done: readonly string[];
    onStart: (tourId: string) => void;
  }

  let { tours, done, onStart }: Props = $props();

  const recommended = $derived(tours.find(tour => !done.includes(tour.id)) ?? tours[0]);
  const others = $derived(tours.filter(tour => tour !== recommended));
</script>

<div class="flex flex-col gap-2" data-tour="tour-chooser">
  {#if recommended}
    <div class="flex flex-col gap-3 rounded-xl border-2 border-primary/60 bg-primary/5 p-4">
      <div class="flex items-start gap-3">
        <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
          <TourIcon icon={recommended.icon} class="text-primary" />
        </span>
        <div class="flex min-w-0 flex-1 flex-col gap-0.5">
          <span class="flex items-center gap-2">
            <span class="font-semibold">{t(recommended.title)}</span>
            <span
              class="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground uppercase"
            >
              {t(m.recommended)}
            </span>
          </span>
          <span class="text-[13px] text-muted-foreground">{t(recommended.summary)}</span>
        </div>
      </div>
      {#if recommended.id === 'agent'}
        <p class="text-[13px] leading-snug text-muted-foreground">{t(m.recommendedWhy)}</p>
      {/if}
      <div class="flex items-center gap-2">
        <span class="text-xs text-muted-foreground">
          {t(m.tourLength(recommended.steps.length, recommended.minutes))}
        </span>
        <span class="flex-1"></span>
        <Button size="sm" onclick={() => onStart(recommended.id)}>{t(m.startThisTour)}</Button>
      </div>
    </div>
  {/if}
  {#each others as tour (tour.id)}
    <div class="flex items-center gap-3 rounded-xl border px-4 py-3">
      <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <TourIcon icon={tour.icon} class="text-primary" />
      </span>
      <span class="flex min-w-0 flex-1 flex-col">
        <span class="text-sm font-semibold">{t(tour.title)}</span>
        <span class="text-xs text-muted-foreground">
          {t(m.tourLengthShort(tour.steps.length, tour.minutes))}
        </span>
      </span>
      {#if done.includes(tour.id)}
        <span class="flex items-center gap-1 text-xs text-success">
          <CircleCheckIcon class="size-4" aria-hidden="true" />{t(m.done)}
        </span>
      {:else}
        <Button variant="ghost" size="sm" class="text-primary" onclick={() => onStart(tour.id)}>
          {t(m.startShort)}
        </Button>
      {/if}
    </div>
  {/each}
</div>
