<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { motionDuration } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import {
    onboardingMessages as m,
  } from '@base/features/onboarding/presentation/messages/onboarding.messages.ts';
  import type { OnboardingSubject } from '@base/features/onboarding/domain/structs/onboarding-status.struct.ts';
  import TourIcon from './TourIcon.svelte';
  import type { TourDefinition } from './tour-steps.registry.ts';

  interface Props {
    tour: TourDefinition;
    subject: OnboardingSubject;
    onStart: () => void;
    onDecline: () => void;
  }

  let { tour, subject, onStart, onDecline }: Props = $props();

  const NEEDS_POLL_MS = 500;

  const steps = $derived.by(() => {
    const index = tour.steps.findIndex(step => step.id === tour.offer?.step);
    return tour.steps.length - Math.max(index, 0);
  });

  let found = $state(false);

  $effect(() => {
    const needs = tour.offer?.needs;
    if (!needs) {
      found = true;
      return;
    }
    const check = () => {
      found = !!needs(document, subject);
    };
    check();
    const timer = setInterval(check, NEEDS_POLL_MS);
    return () => clearInterval(timer);
  });
</script>

{#if found}
  <div
    in:fly={{ y: 8, duration: motionDuration(250) }}
    out:fade={{ duration: motionDuration(150) }}
    role="dialog"
    aria-label={t(tour.title)}
    data-tour-offer={tour.id}
    class="fixed right-4 bottom-4 z-[200] flex w-[380px] max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-[14px] border border-border bg-background px-5 pt-4 pb-4 text-foreground shadow-xl"
  >
    <div class="flex flex-col gap-1">
      <span class="text-[11px] font-semibold tracking-wide text-primary uppercase">
        {t(m.offerEyebrow)}
      </span>
      <div class="flex items-center gap-2">
        <TourIcon icon={tour.icon} class="shrink-0 text-primary" />
        <h2 class="text-base leading-tight">{t(tour.title)}</h2>
        <span class="flex-1"></span>
        <span
          class="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-primary"
        >
          {t(m.tourLengthShort(steps, tour.minutes))}
        </span>
      </div>
    </div>
    <div class="flex flex-col gap-1">
      <p class="text-[13px] leading-snug text-muted-foreground">{t(tour.summary)}</p>
      <p class="text-xs leading-snug text-muted-foreground">{t(m.offerLater)}</p>
    </div>
    <div class="flex items-center gap-2 pt-1">
      <Button
        variant="outline"
        size="sm"
        class="h-[30px] rounded-lg px-3 text-[13px]"
        onclick={onDecline}
      >
        {t(m.notNow)}
      </Button>
      <span class="flex-1"></span>
      <Button
        size="sm"
        class="h-[30px] rounded-lg px-3.5 text-[13px] font-semibold"
        onclick={onStart}
      >
        {t(m.start)}
      </Button>
    </div>
  </div>
{/if}
