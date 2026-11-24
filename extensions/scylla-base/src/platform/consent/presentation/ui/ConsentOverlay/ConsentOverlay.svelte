<script lang="ts">
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import {
    bannerNeeded,
    consentAction,
    grantedPurposes,
    type ConsentGrants,
    type ConsentSource,
    type ConsentState,
  } from '../../../domain/structs/consent-choice.struct.ts';
  import { consentMutations, consentQueries } from '../../consent.queries.ts';
  import {
    allPurposes,
    consentFrame,
    consentText,
    lastChoiceText,
    purposeRows,
  } from '../../presenters/consent.presenter.ts';
  import ConsentBanner from '../ConsentBanner/ConsentBanner.svelte';
  import ConsentPreferences from '../ConsentPreferences/ConsentPreferences.svelte';
  import { cookieSettings } from '../cookie-settings.state.svelte.ts';
  import type { PolicyLink } from '../policy-link.ts';

  let { policy }: { policy?: PolicyLink } = $props();

  const NO_CHOICE: ConsentState = { choice: null, globalPrivacyControl: false };

  const frame = consentFrame();
  const rows = $derived(purposeRows(frame));
  const query = createQuery(() => consentQueries.state());
  const save = createMutation(() => consentMutations.save());

  const state = $derived(query.data ?? NO_CHOICE);
  const granted = $derived(grantedPurposes(state, frame.version, new Date()));
  const banner = $derived(
    query.isSuccess && cookieSettings.openFrom === null && bannerNeeded(state, frame.version, new Date()),
  );

  /** Records a choice; the cookie settings close when the server has it. */
  const choose = (grants: ConsentGrants, source: ConsentSource) => {
    const id = state.choice?.id;
    save.mutate(
      {
        id: id ? id : null,
        version: frame.version,
        text: consentText(rows),
        grants,
        action: consentAction(grants, granted),
        source,
      },
      { onSuccess: () => cookieSettings.close() },
    );
  };
</script>

<!-- Rendered once over each page: the host renders it only while one tracker needs consent. -->
{#if banner}
  <ConsentBanner
    {rows}
    {policy}
    pending={save.isPending}
    onaccept={() => choose(allPurposes(frame, true), 'banner')}
    onreject={() => choose(allPurposes(frame, false), 'banner')}
    oncustomize={() => cookieSettings.open('banner')}
  />
{/if}
<!-- It waits for the choice of the browser: its switches start there. -->
<ConsentPreferences
  open={query.isSuccess && cookieSettings.openFrom !== null}
  {rows}
  {granted}
  globalPrivacyControl={state.globalPrivacyControl}
  lastChoice={lastChoiceText(state.choice)}
  {policy}
  pending={save.isPending}
  onsave={grants => choose(grants, cookieSettings.openFrom === 'account' ? 'account' : 'preferences')}
  onclose={() => cookieSettings.close()}
/>
