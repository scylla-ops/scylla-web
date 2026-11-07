<script lang="ts">
  import type { Snippet } from 'svelte';
  import { navigateTo } from '@platform/context';
  import { userState } from '@platform/user-state';
  import { routePathname } from '@scylla/core-sdk';
  import { ErrorState } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { Button } from '@scylla/ui/primitives';
  import { hasSession, loginPathBackTo, sessionUserId } from '@base/features/login';
  import { layoutMessages } from '../../layout/messages/layout.messages.ts';

  let { children }: { children: Snippet } = $props();

  /** `undefined` while the cookie is checked: nothing shows, and nothing redirects. */
  let authenticated = $state<boolean | undefined>(undefined);
  /** The server gave no answer about the session: the session can still be valid. */
  let unreachable = $state(false);
  let attempt = $state(0);

  const RETRY_MS = 5_000;

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
  {@render children()}
{:else if unreachable}
  <div class="flex min-h-svh flex-col items-center justify-center gap-4 p-4">
    <ErrorState title={t(layoutMessages.serverDown)} message={t(layoutMessages.serverDownBody)} />
    <Button variant="outline" onclick={() => (attempt += 1)}>{t(layoutMessages.tryAgain)}</Button>
  </div>
{/if}
