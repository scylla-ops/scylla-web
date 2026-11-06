<script lang="ts">
  import { Permission, authorizationReady, can } from '@platform/authz';
  import { currentPathname } from '@platform/context';
  import { startableTours } from '@base/features/onboarding/presentation/presenters/intro.presenter.ts';
  import { offeredTour } from '@base/features/onboarding/presentation/presenters/tour.presenter.ts';
  import {
    createOnboardingTour,
  } from './onboarding-tour.state.svelte.ts';
  import FinishTourDialog from './FinishTourDialog.svelte';
  import IntroDialog from './IntroDialog.svelte';
  import SkipTourDialog from './SkipTourDialog.svelte';
  import TourOffer from './TourOffer.svelte';
  import TourSpot from './TourSpot.svelte';
  import { MAIN_TOUR_IDS, TOURS } from './tour-steps.registry.ts';

  const tour = createOnboardingTour(
    () => authorizationReady() && can(Permission.CREATE_AGENT) && can(Permission.CREATE_PROJECT),
  );

  const mainTours = $derived(startableTours(TOURS, MAIN_TOUR_IDS, can));
  const offer = $derived(
    tour.view === 'none' && tour.status && authorizationReady()
      ? offeredTour(TOURS, currentPathname(), tour.status, can)
      : undefined,
  );
</script>

{#if tour.view === 'intro'}
  <IntroDialog
    open
    tours={mainTours}
    done={tour.done}
    onStart={id => tour.startTour(id)}
    onSkip={() => tour.skipIntro()}
  />
{:else if tour.view === 'finish' && tour.tour}
  <FinishTourDialog
    tour={tour.tour}
    tours={mainTours}
    done={tour.done}
    onStart={id => tour.startTour(id)}
    onFinish={() => tour.finish()}
  />
{:else if tour.view === 'spot' && tour.step}
  <TourSpot {tour} step={tour.step} />
  <SkipTourDialog
    open={tour.confirmingSkip}
    onSkip={() => tour.confirmSkip()}
    onContinue={() => tour.cancelSkip()}
  />
{/if}
{#if offer}
  {#key offer.tour.id}
    <TourOffer
      tour={offer.tour}
      subject={offer.subject}
      onStart={() => {
        if (offer?.tour.offer) {
          tour.startOffer(offer.tour.id, offer.tour.offer.step, offer.subject);
        }
      }}
      onDecline={() => {
        if (offer) tour.declineOffer(offer.tour.id);
      }}
    />
  {/key}
{/if}
