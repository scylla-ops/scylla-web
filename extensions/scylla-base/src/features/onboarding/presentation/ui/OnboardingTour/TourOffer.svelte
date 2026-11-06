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
    class="fixed right-4 bottom-4 z-[60] flex w-[340px] max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-[14px] border border-border bg-background p-4 text-foreground shadow-xl"
  >
    <div class="flex items-start gap-3">
      <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
        <TourIcon icon={tour.icon} class="text-primary" />
      </span>
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span class="text-xs font-semibold text-primary">{t(m.offerEyebrow)}</span>
        <h2 class="text-base leading-tight">{t(tour.title)}</h2>
        <p class="text-[13px] leading-snug text-muted-foreground">{t(tour.summary)}</p>
      </div>
    </div>
    <p class="text-xs text-muted-foreground">
      {t(m.tourLength(steps, tour.minutes))} · {t(m.offerLater)}
    </p>
    <div class="flex items-center gap-2">
      <span class="flex-1"></span>
      <Button
        variant="outline"
        size="sm"
        class="h-[30px] rounded-lg px-3 text-[13px]"
        onclick={onDecline}
      >
        {t(m.notNow)}
      </Button>
      <Button size="sm" class="h-[30px] rounded-lg px-3.5 text-[13px] font-semibold" onclick={onStart}>
        {t(m.start)}
      </Button>
    </div>
  </div>
{/if}
