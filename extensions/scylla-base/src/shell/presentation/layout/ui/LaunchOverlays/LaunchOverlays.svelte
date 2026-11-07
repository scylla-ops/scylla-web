<script lang="ts">
  import { loadOnboardingTour } from '@base/features/onboarding';
  import { unseenRelease } from '@base/shell/presentation/layout/whats-new.state.svelte.ts';
  import { userState } from '@platform/user-state';
  import WhatsNewDialog from '../WhatsNewDialog/WhatsNewDialog.svelte';
</script>

<!--
  One window at a time: the release announcement first, then the onboarding tour. Both wait for the
  state of the person: a new device must not show the dialog that this person already closed.
-->
{#await userState.whenLoaded() then}
  {#if unseenRelease()}
    <WhatsNewDialog />
  {:else}
    {#await loadOnboardingTour() then { default: OnboardingTour }}
      <OnboardingTour />
    {/await}
  {/if}
{/await}
