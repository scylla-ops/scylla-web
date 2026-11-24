<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { dialogHoldStore } from '@scylla/ui/stores';
  import {
    onboardingMessages,
  } from '@base/features/onboarding/presentation/messages/onboarding.messages.ts';
  import type {
    OnboardingTour,
  } from './onboarding-tour.state.svelte.ts';
  import {
    VIEWPORT_MARGIN,
    placeCard,
    presentRects,
  } from '@base/features/onboarding/presentation/presenters/tour-placement.presenter.ts';
  import type { OnboardingSubject } from '@base/features/onboarding/domain/structs/onboarding-status.struct.ts';
  import type { TourSpotStep } from './tour-steps.registry.ts';
  import {
    allowedAnchor,
    blockPage,
    holdDialogs,
    holdKeyboard,
    markTourActive,
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

  let layout = $state<TourLayout>({ targets: [], final: [], allowed: null, avoid: [], moving: false });
  let lostAt = $state<{ stepId: string; onPage: boolean } | null>(null);
  let hintStepId = $state<string | null>(null);
  let actionState = $state<{ stepId: string; action: TourActionState | null } | null>(null);
  let cardWidth = $state(0);
  let cardHeight = $state(0);
  let viewportWidth = $state(0);
  let viewportHeight = $state(0);

  const viewport = $derived({ width: viewportWidth, height: viewportHeight });
  const holes = $derived(presentRects(layout.targets));
  const target = $derived(layout.final[0] ?? null);
  const others = $derived(presentRects(layout.final.slice(1)));
  const cardSize = $derived({ width: cardWidth, height: cardHeight });
  const card = $derived(
    target ? placeCard(target, cardSize, viewport, layout.avoid, others) : null,
  );
  const connectors = $derived(card?.connector && !layout.moving ? [card.connector] : []);
  const lost = $derived(!card && lostAt?.stepId === step.id);
  const showNext = $derived(step.advance.on === 'next' || !!step.nextWhen);
  const blocking = $derived(!!card && showNext && !step.form);

  const action = $derived(actionState?.stepId === step.id ? actionState.action : null);
  const ready = $derived(!!step.action && !!action && !action.disabled);
  const absent = $derived(
    actionState?.stepId === step.id && !action ? step.action?.absent : undefined,
  );
  const shown = $derived.by(() => {
    if (ready && step.action?.ready) return step.action.ready;
    return absent ? { title: step.title, body: absent.body } : step;
  });

  const press = () => {
    if (!step.action) return;
    pressable(step.action.anchor(document, tour.subject))?.click();
  };

  const primary = $derived.by(() => {
    if ((lost && !step.go) || absent) return undefined;
    if (step.action) {
      const label = step.action.label ? t(step.action.label) : action?.label;
      return label ? { label, disabled: !ready, onClick: press } : undefined;
    }
    if (step.go) {
      return { label: t(onboardingMessages.go), disabled: false, onClick: () => tour.go() };
    }
    if (!showNext) return undefined;
    return {
      label: t(tour.isLastStep ? onboardingMessages.finish : onboardingMessages.next),
      disabled: !tour.canGoNext,
      onClick: () => tour.next(),
    };
  });

  const waiting = $derived.by(() => {
    if (!step.waiting || tour.agentOffline) return undefined;
    const pending = step.action ? !ready : !tour.canGoNext;
    return pending ? t(step.waiting) : undefined;
  });

  /** A step before this one can sit under the dialog that this one points at: close it first. */
  const closeOpenDialog = () => {
    if (!document.querySelector('[data-slot="dialog-content"]')) return;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  };

  const onPrevious = $derived(
    tour.canGoPrevious
      ? () => {
          dialogHoldStore.setState({ held: false });
          closeOpenDialog();
          tour.previous();
        }
      : undefined,
  );

  const notice = $derived.by(() => {
    if (lost && !step.go) {
      if (lostAt?.onPage) return { text: t(onboardingMessages.lostAbsentNotice) };
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
    rewound: tour.rewound,
    onLayout: (next: TourLayout) => {
      layout = next;
    },
    onAction: (next: TourActionState | null) => {
      actionState = { stepId: step.id, action: next };
    },
    onAdvance: (found?: OnboardingSubject) => tour.advance(step.id, found),
    onUnlock: () => tour.unlock(step.id),
    onLock: () => tour.lock(step.id),
    onLost: () => {
      lostAt = { stepId: step.id, onPage: tour.onStepPage };
      tour.recover(step.id);
    },
    onFound: () => {
      lostAt = null;
    },
    onHint: (visible: boolean) => {
      hintStepId = visible ? step.id : null;
    },
    isLoading: () => tour.isLoading,
  });

  const blockingOptions = $derived({
    active: blocking && !tour.confirmingSkip,
    allowed: () => allowedAnchor(step)?.(document, tour.subject) ?? null,
  });

  const holdingDialogs = $derived(!!step.holdsDialog && !lost && !tour.confirmingSkip);

  const keyboard = $derived({
    holdSearch: !lost,
    loopTab: !!card && !tour.confirmingSkip,
    targets: () => step.targets.map(anchor => anchor(document, tour.subject)),
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
    hidden={tour.confirmingSkip}
    gliding={layout.moving}
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
  {@attach holdDialogs(() => holdingDialogs)}
  {@attach holdKeyboard(() => keyboard)}
  {@attach markTourActive}
  data-onboarding-tour
  class="contents"
  style:visibility={tour.confirmingSkip ? 'hidden' : undefined}
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
