<script lang="ts">
  import { createQuery } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import { signOut } from '@base/features/login';
  import { userQueries } from '@base/features/user';
  // By path, not the barrel: this file is in the entry chunk, the other components are not.
  import {
    userName,
    userSecondaryLine,
  } from '@shared/presentation/ui/data-display/user-identity.ts';
  import { layoutMessages } from '../layout.messages.ts';

  const meQuery = createQuery(() => userQueries.me());

  const LINK =
    'text-muted-foreground underline-offset-4 hover:text-foreground hover:underline cursor-pointer';
</script>

<!--
  The session on a screen with no sidebar, as one line in the style of the links of the sign-in
  page: who is signed in, the account page (`/account`: the user may have no organization), the
  sign-out.
-->
<p class="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-sm">
  {#if meQuery.data}
    <span class="text-muted-foreground" title={userSecondaryLine(meQuery.data)}>
      {t(layoutMessages.signedInAs(userName(meQuery.data)))}
    </span>
    <span aria-hidden="true" class="text-muted-foreground">·</span>
  {/if}
  <a href="/account" class={LINK}>{t(layoutMessages.account)}</a>
  <span aria-hidden="true" class="text-muted-foreground">·</span>
  <button type="button" class={LINK} onclick={signOut}>{t(layoutMessages.signOut)}</button>
</p>
