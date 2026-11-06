<script lang="ts">
  import BookOpenIcon from '@lucide/svelte/icons/book-open';
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import LifeBuoyIcon from '@lucide/svelte/icons/life-buoy';
  import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
  import SparklesIcon from '@lucide/svelte/icons/sparkles';
  import { can } from '@platform/authz';
  import {
    Button,
    buttonVariants,
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import {
    onboardingMessages as m,
  } from '@base/features/onboarding/presentation/messages/onboarding.messages.ts';
  import { startableTours } from '@base/features/onboarding/presentation/presenters/intro.presenter.ts';
  import { createTourLauncher } from '../OnboardingTour/onboarding-tour.state.svelte.ts';
  import TourIcon from '../OnboardingTour/TourIcon.svelte';
  import { SCYLLA_DOCS_URL, TOURS } from '../OnboardingTour/tour-steps.registry.ts';

  const launcher = createTourLauncher();
  const tours = $derived(
    startableTours(
      TOURS,
      TOURS.map(tour => tour.id),
      can,
    ),
  );
  const doneCount = $derived(tours.filter(tour => launcher.done.includes(tour.id)).length);
  const progress = $derived(tours.length ? (doneCount / tours.length) * 100 : 0);
</script>

<div class="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-8" data-tour="help-page">
  <header class="flex items-center gap-4 border-b pb-6">
    <span class="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/15">
      <LifeBuoyIcon class="size-7 text-primary" aria-hidden="true" />
    </span>
    <div class="flex min-w-0 flex-col gap-1">
      <h1>{t(m.helpTitle)}</h1>
      <p class="text-sm text-muted-foreground">{t(m.helpSubtitle)}</p>
    </div>
  </header>

  <section aria-labelledby="help-tours">
    <Card class="gap-4">
      <CardHeader>
        <CardTitle><h2 id="help-tours" class="text-base">{t(m.guidedTours)}</h2></CardTitle>
        <CardDescription>{t(m.helpToursDescription)}</CardDescription>
        <CardAction>
          <div class="flex flex-col items-end gap-1.5">
            <span class="text-xs text-muted-foreground tabular-nums">
              {t(m.toursDone(doneCount, tours.length))}
            </span>
            <span
              class="block h-1.5 w-40 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={tours.length}
              aria-valuenow={doneCount}
              aria-label={t(m.toursDone(doneCount, tours.length))}
            >
              <span class="block h-full rounded-full bg-primary" style:width="{progress}%"></span>
            </span>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ul class="divide-y overflow-hidden rounded-lg border">
          {#each tours as tour (tour.id)}
            {@const done = launcher.done.includes(tour.id)}
            <li class="flex items-center gap-3 px-3.5 py-2.5" data-tour-row={tour.id}>
              <span
                class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15"
              >
                <TourIcon icon={tour.icon} class="text-primary" />
              </span>
              <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                <span class="text-sm font-semibold">{t(tour.title)}</span>
                <span class="text-[13px] text-muted-foreground">{t(tour.summary)}</span>
              </span>
              <span class="flex shrink-0 items-center justify-end gap-3 sm:w-56">
                {#if done}
                  <span class="flex items-center gap-1 text-xs font-semibold text-primary">
                    <CircleCheckIcon class="size-3.5" aria-hidden="true" />
                    {t(m.done)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    class="text-muted-foreground"
                    onclick={() => launcher.start(tour.id)}
                  >
                    <RotateCcwIcon class="size-3.5" aria-hidden="true" />
                    {t(m.restart)}
                  </Button>
                {:else}
                  <span class="hidden text-xs text-muted-foreground tabular-nums sm:inline">
                    {t(m.tourLengthShort(tour.steps.length, tour.minutes))}
                  </span>
                  <Button variant="outline" size="sm" onclick={() => launcher.start(tour.id)}>
                    {t(m.start)}
                  </Button>
                {/if}
              </span>
            </li>
          {/each}
        </ul>
      </CardContent>
    </Card>
  </section>

  <div class="grid gap-4 md:grid-cols-2">
    <Card class="gap-4">
      <CardHeader class="flex items-start gap-3">
        <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
          <SparklesIcon class="size-4 text-primary" aria-hidden="true" />
        </span>
        <div class="flex flex-col gap-1">
          <CardTitle><h2 class="text-[15px]">{t(m.welcomeScreen)}</h2></CardTitle>
          <CardDescription>{t(m.welcomeScreenBody)}</CardDescription>
        </div>
      </CardHeader>
      <CardContent class="mt-auto flex justify-end">
        <Button variant="outline" size="sm" onclick={() => launcher.reopenIntro()}>
          {t(m.showAgain)}
        </Button>
      </CardContent>
    </Card>
    <Card class="gap-4">
      <CardHeader class="flex items-start gap-3">
        <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
          <BookOpenIcon class="size-4 text-primary" aria-hidden="true" />
        </span>
        <div class="flex flex-col gap-1">
          <CardTitle><h2 class="text-[15px]">{t(m.documentation)}</h2></CardTitle>
          <CardDescription>{t(m.documentationBody)}</CardDescription>
        </div>
      </CardHeader>
      <CardContent class="mt-auto flex justify-end">
        <a
          href={SCYLLA_DOCS_URL}
          target="_blank"
          rel="noreferrer"
          class={buttonVariants({ size: 'sm' })}
        >
          {t(m.openDocs)}
          <ExternalLinkIcon class="size-3.5" aria-hidden="true" />
        </a>
      </CardContent>
    </Card>
  </div>
</div>
