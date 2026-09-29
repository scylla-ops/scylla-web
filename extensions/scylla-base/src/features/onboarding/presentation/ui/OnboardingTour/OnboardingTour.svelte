<script lang="ts">
  import { Permission, authorizationReady, can } from '@platform/authz';
  import { createOnboardingTourState } from '../../onboarding-tour.state.svelte.ts';
  import FinishTourDialog from '../FinishTourDialog.svelte';
  import SkipTourDialog from '../SkipTourDialog.svelte';
  import TourSpot from '../TourSpot.svelte';
  import WelcomeDialog from '../WelcomeDialog.svelte';

  const tour = createOnboardingTourState(
    () => authorizationReady() && can(Permission.CREATE_AGENT) && can(Permission.CREATE_PROJECT),
  );
</script>

{#if tour.visible && tour.step}
  {#if tour.step.kind === 'welcome'}
    <WelcomeDialog
      open={!tour.confirmingSkip}
      onStart={() => tour.start()}
      onSkip={() => tour.requestSkip()}
    />
  {:else if tour.step.kind === 'finish'}
    <FinishTourDialog onFinish={() => tour.finish()} />
  {:else if tour.step.kind === 'spot' && !tour.confirmingSkip}
    <TourSpot {tour} step={tour.step} />
  {/if}
  <SkipTourDialog
    open={tour.confirmingSkip}
    onSkip={() => tour.confirmSkip()}
    onContinue={() => tour.cancelSkip()}
  />
{/if}
