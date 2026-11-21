<script lang="ts">
  import { consentFrame, loadConsentOverlay } from '@platform/consent';
  import { legalLinks, legalQueries } from '@platform/legal';
  import { createQuery } from '@scylla/core-sdk';

  // The registry decides: while each tracker is exempt, the framework stays hidden.
  const on = consentFrame().on;
  const legal = createQuery(() => ({ ...legalQueries.info(), enabled: on }));
  const policy = $derived(legalLinks(legal.data, ['cookies'])[0]);
</script>

<!-- Over each page, public or not: the banner and the cookie settings of `@platform/consent`. -->
{#if on}
  {#await loadConsentOverlay() then { default: ConsentOverlay }}
    <ConsentOverlay policy={policy && { href: policy.href, external: policy.external }} />
  {/await}
{/if}
