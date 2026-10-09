<script lang="ts">
  import type { Snippet } from 'svelte';
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
  import LogoScylla from '@scylla/ui/assets/logo_scylla.svg';
  import LogoScyllaDark from '@scylla/ui/assets/logo_scylla_dark.svg';
  import { t } from '@scylla/ui/i18n';
  import { layoutMessages } from '../../layout/ui/layout.messages.ts';
  import AuthGuard from '../AuthGuard/Auth.guard.svelte';

  let { children }: { children: Snippet } = $props();
</script>

<!--
  The layout of the `personal` mount: the pages of the signed-in user that need no organization.
  The frame of the sign-in pages (the logo, a centered column, a way back), with no organization
  gate, no sidebar and no bar: a user who has no organization reaches these pages too.
-->
<AuthGuard>
  <!-- `pt-16`: the core's dark-mode toggle is fixed in the top-right corner, 56px high. -->
  <div class="flex min-h-svh flex-col items-center bg-background px-4 pt-16 pb-10 sm:px-6">
    <!-- A dark variant swapped by CSS: `.dark` is set before the first paint, so no flash. -->
    <img src={LogoScylla} alt="Scylla" class="mb-8 w-56 dark:hidden" />
    <img src={LogoScyllaDark} alt="Scylla" class="mb-8 hidden w-56 dark:block" />

    <div class="flex w-full max-w-3xl flex-col gap-4">
      <!-- `/` opens the organization of the user, or the first-organization screen. -->
      <a
        href="/"
        class="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        <ArrowLeftIcon class="size-4" />
        {t(layoutMessages.back)}
      </a>

      <!-- The page puts the sign-out after its last section: the router places it out of this flow. -->
      {@render children()}
    </div>
  </div>
</AuthGuard>
