<script lang="ts">
  import BookOpenIcon from '@lucide/svelte/icons/book-open';
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
  import SparklesIcon from '@lucide/svelte/icons/sparkles';
  import { can } from '@platform/authz';
  import { t } from '@scylla/ui/i18n';
  import {
    onboardingMessages as m,
  } from '@base/features/onboarding/presentation/messages/onboarding.messages.ts';
  import { startableTours } from '@base/features/onboarding/presentation/presenters/intro.presenter.ts';
  import { createTourLauncher } from '../OnboardingTour/onboarding-tour.state.svelte.ts';
  import TourIcon from '../OnboardingTour/TourIcon.svelte';
  import { SCYLLA_DOCS_URL, TOURS } from '../OnboardingTour/tour-steps.registry.ts';

  interface Props {
    onNavigate?: () => void;
  }

  let { onNavigate }: Props = $props();

  const launcher = createTourLauncher();
  const tours = $derived(
    startableTours(
      TOURS,
      TOURS.map(tour => tour.id),
      can,
    ),
  );

  const itemClass =
    'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent';
</script>

<div class="flex flex-col gap-1 p-2" data-tour="tour-menu">
  <p class="px-2.5 pt-1 pb-1 text-xs font-semibold text-muted-foreground">{t(m.guidedTours)}</p>
  {#each tours as tour (tour.id)}
    <button
      type="button"
      class={itemClass}
      onclick={() => {
        launcher.start(tour.id);
        onNavigate?.();
      }}
    >
      <TourIcon icon={tour.icon} class="text-primary" />
      <span class="flex flex-1 flex-col">
        <span class="font-medium">{t(tour.title)}</span>
        <span class="text-xs text-muted-foreground">{t(tour.summary)}</span>
      </span>
      {#if launcher.done.includes(tour.id)}
        <CircleCheckIcon class="size-4 text-success" aria-label={t(m.done)} />
      {:else}
        <span class="text-xs text-muted-foreground tabular-nums">
          {t(m.stepTotal(tour.steps.length))}
        </span>
      {/if}
    </button>
  {/each}
  <div class="my-1 h-px bg-border"></div>
  <button
    type="button"
    class={itemClass}
    onclick={() => {
      launcher.reopenIntro();
      onNavigate?.();
    }}
  >
    <SparklesIcon class="size-4 text-primary" aria-hidden="true" />
    <span class="font-medium">{t(m.welcomeAgain)}</span>
  </button>
  <a href={SCYLLA_DOCS_URL} target="_blank" rel="noreferrer" class={itemClass}>
    <BookOpenIcon class="size-4 text-primary" aria-hidden="true" />
    <span class="font-medium">{t(m.documentation)}</span>
  </a>
</div>
