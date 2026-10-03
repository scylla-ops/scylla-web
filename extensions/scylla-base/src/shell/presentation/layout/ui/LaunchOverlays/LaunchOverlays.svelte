<script lang="ts">
  import { loadOnboardingTour } from '@base/features/onboarding';
  import { unseenRelease } from '../../whats-new.svelte.ts';
  import WhatsNewDialog from '../WhatsNewDialog/WhatsNewDialog.svelte';
</script>

<!-- One window at a time: the release announcement first, then the onboarding tour. -->
{#if unseenRelease()}
  <WhatsNewDialog />
{:else}
  {#await loadOnboardingTour() then { default: OnboardingTour }}
    <OnboardingTour />
  {/await}
{/if}
