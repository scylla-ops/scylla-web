<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { onboardingMessages } from '../onboarding.messages.ts';
  import type { OnboardingTourState } from '../onboarding-tour.state.svelte.ts';
  import { VIEWPORT_MARGIN, placeCard, spotlightRect } from '../tour-placement.calculator.ts';
  import type { TourSpotStep } from '../tour-steps.ts';
  import {
    allowedAnchor,
    blockPage,
    portalToBody,
    trackTourStep,
    type TourLayout,
  } from '../tour-tracking.actions.ts';
  import TourCard from './TourCard.svelte';
  import TourSpotlight from './TourSpotlight.svelte';

  interface Props {
    tour: OnboardingTourState;
    step: TourSpotStep;
  }

  let { tour, step }: Props = $props();

  let layout = $state<TourLayout>({ targets: [], allowed: null });
  let lostStepId = $state<string | null>(null);
  let hintStepId = $state<string | null>(null);
  let cardWidth = $state(0);
  let cardHeight = $state(0);
  let noteWidth = $state(0);
  let noteHeight = $state(0);
  let viewportWidth = $state(0);
  let viewportHeight = $state(0);

  const viewport = $derived({ width: viewportWidth, height: viewportHeight });
  const holes = $derived(
    layout.targets.filter(rect => rect !== null).map(rect => spotlightRect(rect, viewport)),
  );
  const target = $derived(layout.targets[0] ? spotlightRect(layout.targets[0], viewport) : null);
  const card = $derived(
    target ? placeCard(target, { width: cardWidth, height: cardHeight }, viewport) : null,
  );
  const noteTarget = $derived(step.note && layout.targets[step.note.target]);
  const note = $derived(
    noteTarget
      ? placeCard(
          spotlightRect(noteTarget, viewport),
          { width: noteWidth, height: noteHeight },
          viewport,
        )
      : null,
  );
  const connectors = $derived(
    [card?.connector, note?.connector].filter(connector => typeof connector === 'string'),
  );
  const lost = $derived(!card && lostStepId === step.id);
  const showNext = $derived(step.advance.on === 'next' || !!step.nextWhen);
  const blocking = $derived(!!card && showNext);

  const controls = $derived({
    showNext: showNext && !lost,
    canGoNext: tour.canGoNext,
    onNext: () => tour.next(),
    onSkip: () => tour.requestSkip(),
  });

  const notice = $derived.by(() => {
    if (lost) {
      return {
        text: t(onboardingMessages.lostNotice),
        action: tour.canGoBack
          ? { label: t(onboardingMessages.goBack), onClick: () => tour.goBack() }
          : undefined,
      };
    }
    if (tour.agentOffline) {
      return {
        text: t(onboardingMessages.agentOffline),
        action: { label: t(onboardingMessages.openAgent), onClick: () => tour.openAgent() },
      };
    }
    return undefined;
  });

  const hint = $derived(
    step.hint && hintStepId === step.id
      ? { body: step.hint.body.map(paragraph => t(paragraph)), link: step.hint.link }
      : undefined,
  );

  const tracking = $derived({
    step,
    subject: tour.subject,
    onLayout: (next: TourLayout) => {
      layout = next;
    },
    onAdvance: () => tour.advance(step.id),
    onUnlock: () => tour.unlock(step.id),
    onLost: () => {
      lostStepId = step.id;
      tour.recover(step.id);
    },
    onHint: (shown: boolean) => {
      hintStepId = shown ? step.id : null;
    },
  });

  const blockingOptions = $derived({
    active: blocking,
    allowed: () => allowedAnchor(step)?.(document, tour.subject) ?? null,
  });
</script>

<svelte:window bind:innerWidth={viewportWidth} bind:innerHeight={viewportHeight} />

{#snippet stepCard(x: number, y: number)}
  <TourCard
    title={t(step.title)}
    body={step.body.map(paragraph => t(paragraph))}
    link={step.link}
    waiting={step.waiting && !tour.canGoNext ? t(step.waiting) : undefined}
    {hint}
    {notice}
    count={tour.count}
    {controls}
    wide={step.wide}
    {x}
    {y}
    bind:width={cardWidth}
    bind:height={cardHeight}
  />
{/snippet}

<div
  use:portalToBody
  use:blockPage={blockingOptions}
  use:trackTourStep={tracking}
  data-onboarding-tour
  class="contents"
>
  {#if card}
    <TourSpotlight {viewport} {holes} {connectors} {blocking} allowed={layout.allowed} />
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
