<script lang="ts">
  import type { Snippet } from 'svelte';
  import { navigateTo } from '@platform/context';
  import { userState } from '@platform/user-state';
  import { createQuery, routePathname } from '@scylla/core-sdk';
  import { ErrorState } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { Button } from '@scylla/ui/primitives';
  import {
    hasSession,
    loadTermsStep,
    loginPathBackTo,
    loginQueries,
    sessionUserId,
  } from '@base/features/login';
  import { loadAccountDeletion } from '@base/features/user';
  import { layoutMessages } from '../../layout/messages/layout.messages.ts';

  let { children }: { children: Snippet } = $props();

  /** `undefined` while the cookie is checked: nothing shows, and nothing redirects. */
  let authenticated = $state<boolean | undefined>(undefined);
  /** The server gave no answer about the session: the session can still be valid. */
  let unreachable = $state(false);
  let attempt = $state(0);
  /** The person refuses the terms: the dialog that deletes the account is open. */
  let declining = $state(false);

  const RETRY_MS = 5_000;

  /**
   * The terms of service that the user must accept before the app. The server refuses no route
   * to a user who did not accept: an error of this read shows the app.
   */
  const terms = createQuery(() => loginQueries.terms({ enabled: authenticated === true }));
  const termsChecked = $derived(terms.data !== undefined || terms.isError);

  $effect(() => {
    routePathname();
    void attempt;
    let current = true;
    let retry: ReturnType<typeof setTimeout> | undefined;
    void hasSession().then(
      (valid) => {
        if (!current) return;
        unreachable = false;
        const userId = sessionUserId();
        if (valid && userId) userState.load(userId);
        authenticated = valid;
        if (!valid) navigateTo(loginPathBackTo(window.location), { replace: true });
      },
      () => {
        if (!current) return;
        unreachable = true;
        if (!authenticated) retry = setTimeout(() => (attempt += 1), RETRY_MS);
      },
    );
    return () => {
      current = false;
      clearTimeout(retry);
    };
  });
</script>

{#if authenticated}
  {#if terms.data?.acceptanceRequired}
    {@const status = terms.data}
    {#await loadTermsStep() then { default: TermsStep }}
      <TermsStep {status} onDecline={() => (declining = true)} />
    {/await}
    {#await loadAccountDeletion() then { default: AccountDeletion }}
      <AccountDeletion open={declining} onOpenChange={open => (declining = open)} />
    {/await}
  {:else if termsChecked}
    {@render children()}
  {/if}
{:else if unreachable}
  <div class="flex min-h-svh flex-col items-center justify-center gap-4 p-4">
    <ErrorState title={t(layoutMessages.serverDown)} message={t(layoutMessages.serverDownBody)} />
    <Button variant="outline" onclick={() => (attempt += 1)}>{t(layoutMessages.tryAgain)}</Button>
  </div>
{/if}
