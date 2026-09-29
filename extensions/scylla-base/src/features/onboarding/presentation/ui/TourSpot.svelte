<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import type { OnboardingTourState } from '../onboarding-tour.state.svelte.ts';
  import {
    VIEWPORT_MARGIN,
    spotlightRect,
    placeCard,
    type TourRect,
  } from '../tour-placement.calculator.ts';
  import type { TourSpotStep } from '../tour-steps.ts';
  import { trackTourStep } from '../tour-tracking.actions.ts';
  import TourCard from './TourCard.svelte';
  import TourSpotlight from './TourSpotlight.svelte';

  interface Props {
    tour: OnboardingTourState;
    step: TourSpotStep;
  }

  let { tour, step }: Props = $props();

  let rects = $state<readonly (TourRect | null)[]>([]);
  let lost = $state(false);
  let cardWidth = $state(0);
  let cardHeight = $state(0);
  let noteWidth = $state(0);
  let noteHeight = $state(0);
  let viewportWidth = $state(0);
  let viewportHeight = $state(0);

  const viewport = $derived({ width: viewportWidth, height: viewportHeight });
  const holes = $derived(rects.filter(rect => rect !== null).map(rect => spotlightRect(rect, viewport)));
  const target = $derived(rects[0] ? spotlightRect(rects[0], viewport) : null);
  const card = $derived(
    target ? placeCard(target, { width: cardWidth, height: cardHeight }, viewport) : null,
  );
  const noteTarget = $derived(step.note && rects[step.note.target]);
  const note = $derived(
    noteTarget
      ? placeCard(spotlightRect(noteTarget, viewport), { width: noteWidth, height: noteHeight }, viewport)
      : null,
  );
  const connectors = $derived(
    [card?.connector, note?.connector].filter(connector => typeof connector === 'string'),
  );

  const controls = $derived({
    showNext: step.advance.on === 'next' || !!step.nextWhen,
    canGoNext: tour.canGoNext,
    onNext: () => tour.next(),
    onSkip: () => tour.requestSkip(),
  });

  const tracking = $derived({
    step,
    subject: tour.subject,
    onLayout: (next: readonly (TourRect | null)[]) => {
      rects = next;
      if (next[0]) lost = false;
    },
    onAdvance: () => tour.advance(step.id),
    onUnlock: () => tour.unlock(step.id),
    onLost: () => {
      lost = true;
      tour.recover(step.id);
    },
  });
</script>

<svelte:window bind:innerWidth={viewportWidth} bind:innerHeight={viewportHeight} />

{#snippet stepCard(x: number, y: number)}
  <TourCard
    title={t(step.title)}
    body={step.body.map(paragraph => t(paragraph))}
    link={step.link}
    waiting={step.waiting && !tour.canGoNext ? t(step.waiting) : undefined}
    count={tour.count}
    {controls}
    wide={step.wide}
    {x}
    {y}
    bind:width={cardWidth}
    bind:height={cardHeight}
  />
{/snippet}

<div use:trackTourStep={tracking} class="contents">
  {#if card}
    <TourSpotlight {viewport} {holes} {connectors} />
    {@render stepCard(card.x, card.y)}
    {#if step.note && note}
      <TourCard
        body={[t(step.note.body)]}
        link={step.note.link}
        wide={step.wide}
        x={note.x}
        y={note.y}
        bind:width={noteWidth}
        bind:height={noteHeight}
      />
    {/if}
  {:else if lost}
    {@render stepCard(
      viewport.width - cardWidth - VIEWPORT_MARGIN,
      viewport.height - cardHeight - VIEWPORT_MARGIN,
    )}
  {/if}
</div>
