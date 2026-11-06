<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import {
    onboardingMessages,
  } from '@base/features/onboarding/presentation/messages/onboarding.messages.ts';
  import type {
    OnboardingTour,
  } from './onboarding-tour.state.svelte.ts';
  import {
    VIEWPORT_MARGIN,
    placeCard,
    spotlightRect,
  } from '@base/features/onboarding/presentation/presenters/tour-placement.presenter.ts';
  import type { TourSpotStep } from './tour-steps.registry.ts';
  import {
    allowedAnchor,
    blockPage,
    portalToBody,
    pressable,
    trackTourStep,
    type TourActionState,
    type TourLayout,
  } from './tour-tracking.attachments.svelte.ts';
  import TourCard from './TourCard.svelte';
  import TourSpotlight from './TourSpotlight.svelte';

  interface Props {
    tour: OnboardingTour;
    step: TourSpotStep;
  }

  let { tour, step }: Props = $props();

  let layout = $state<TourLayout>({ targets: [], allowed: null });
  let lostStepId = $state<string | null>(null);
  let hintStepId = $state<string | null>(null);
  let actionState = $state<{ stepId: string; action: TourActionState | null } | null>(null);
  let cardWidth = $state(0);
  let cardHeight = $state(0);
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
  const connectors = $derived(card?.connector ? [card.connector] : []);
  const lost = $derived(!card && lostStepId === step.id);
  const showNext = $derived(step.advance.on === 'next' || !!step.nextWhen);
  const blocking = $derived(!!card && showNext);

  const action = $derived(actionState?.stepId === step.id ? actionState.action : null);
  const ready = $derived(!!step.action && !!action && !action.disabled);
  const shown = $derived(ready && step.action?.ready ? step.action.ready : step);

  const press = () => {
    if (!step.action) return;
    pressable(step.action.anchor(document, tour.subject))?.click();
  };

  const primary = $derived.by(() => {
    if (lost) return undefined;
    if (step.action) {
      const label = step.action.label ? t(step.action.label) : action?.label;
      return label ? { label, disabled: !ready, onClick: press } : undefined;
    }
    if (!showNext) return undefined;
    return {
      label: t(tour.isLastStep ? onboardingMessages.finish : onboardingMessages.next),
      disabled: !tour.canGoNext,
      onClick: () => tour.next(),
    };
  });

  const waiting = $derived.by(() => {
    if (!step.waiting) return undefined;
    const pending = step.action ? !ready : !tour.canGoNext;
    return pending ? t(step.waiting) : undefined;
  });

  /** A step before this one can sit under the dialog that this one points at: close it first. */
  const closeOpenDialog = () => {
    if (!document.querySelector('[data-slot="dialog-content"]')) return;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  };

  const onPrevious = $derived(
    tour.canGoPrevious && !lost
      ? () => {
          closeOpenDialog();
          tour.previous();
        }
      : undefined,
  );

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
    onAction: (next: TourActionState | null) => {
      actionState = { stepId: step.id, action: next };
    },
    onAdvance: () => tour.advance(step.id),
    onUnlock: () => tour.unlock(step.id),
    onLost: () => {
      lostStepId = step.id;
      tour.recover(step.id);
    },
    onHint: (visible: boolean) => {
      hintStepId = visible ? step.id : null;
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
    title={t(shown.title)}
    body={shown.body.map(paragraph => t(paragraph))}
    link={step.link}
    {waiting}
    {hint}
    {notice}
    count={tour.count}
    onSkip={() => tour.requestSkip()}
    {onPrevious}
    {primary}
    wide={step.wide}
    {x}
    {y}
    bind:width={cardWidth}
    bind:height={cardHeight}
  />
{/snippet}

<div
  {@attach portalToBody}
  {@attach blockPage(() => blockingOptions)}
  {@attach trackTourStep(() => tracking)}
  data-onboarding-tour
  class="contents"
>
  {#if card}
    <TourSpotlight {viewport} {holes} {connectors} {blocking} allowed={layout.allowed} />
    {@render stepCard(card.x, card.y)}
  {:else if lost}
    {@render stepCard(
      viewport.width - cardWidth - VIEWPORT_MARGIN,
      viewport.height - cardHeight - VIEWPORT_MARGIN,
    )}
  {/if}
</div>
