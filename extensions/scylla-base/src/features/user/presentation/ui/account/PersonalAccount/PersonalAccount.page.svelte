<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { signOut } from '@base/features/login';
  import AccountPage from '../Account/Account.page.svelte';
  import { userMessages } from '../../user.messages.ts';
</script>

<!--
  The account page with no organization (`/account`): no sidebar holds the sign-out, so it comes
  after the last section, in the style of the line under the first-organization card. Here, not
  in the layout: the router places the page out of the flow of its layout.
-->
<div class="flex flex-col gap-2 pb-8">
  <AccountPage />
  <p class="flex justify-center text-center text-sm">
    <button
      type="button"
      class="cursor-pointer text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      onclick={signOut}
    >
      {t(userMessages.signOut)}
    </button>
  </p>
</div>
