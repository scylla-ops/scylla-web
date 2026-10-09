<script lang="ts">
  import { Permission, RequirePermission } from '@platform/authz';
  import { Redirect } from '@scylla/core-sdk';
  import { Skeleton } from '@scylla/ui/shadcn';
  import { ErrorState } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { createUserDetail } from '../../../user-detail.state.svelte.ts';
  import UserDetailContent from '../UserDetailContent.svelte';
  import { userMessages } from '../../user.messages.ts';

  interface Props {
    userId?: string;
  }

  let { userId }: Props = $props();

  const page = createUserDetail(() => userId);
</script>

<!--
  `page.isLoading` is read on the first render: a query result tracks only the fields that
  something reads, and a field read for the first time later stays at its old value.
-->
{#if page.isSelf}
  <!-- From `/<organization>/users/<id>`: an old link to the own settings. -->
  <Redirect to="../../account" />
{:else if page.isLoading || page.resolvingSelf}
  <Skeleton class="m-4 h-64 rounded-xl" />
{:else}
  <!-- Gated here, not on the route: the own id must reach the redirect above without READ_USER. -->
  <RequirePermission permission={Permission.READ_USER}>
    {#if page.redirecting}
      <!-- The redirect of a missing user is in flight. -->
    {:else if page.isError || !page.user}
      <ErrorState message={t(userMessages.userLoadError)} />
    {:else}
      <UserDetailContent {page} user={page.user} />
    {/if}
  </RequirePermission>
{/if}
