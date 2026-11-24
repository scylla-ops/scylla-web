<script lang="ts">
  import { Permission, RequirePermission } from '@platform/authz';
  import { activeWorkspaceSlug, workspaceUrl } from '@platform/context';
  import { Redirect } from '@scylla/core-sdk';
  import { Skeleton } from '@scylla/ui/primitives';
  import { ErrorState } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { createUserDetail } from './user-detail.state.svelte.ts';
  import UserDetailContent from './UserDetailContent.svelte';
  import { userMessages } from '@base/features/user/presentation/messages/user.messages.ts';

  interface Props {
    userId?: string;
  }

  let { userId }: Props = $props();

  const page = createUserDetail(() => userId);
  // The account of the session, in the frame of the active workspace when there is one.
  const slug = activeWorkspaceSlug();
  const accountUrl = slug ? workspaceUrl(slug, 'account') : '/account';
</script>

<!--
  `page.isLoading` is read on the first render: a query result tracks only the fields that
  something reads, and a field read for the first time later stays at its old value.
-->
{#if page.isSelf}
  <!-- From `/admin/users/<id>`: a link to the own settings. -->
  <Redirect to={accountUrl} />
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
