<script lang="ts">
  import { WidgetZone } from '@scylla/core-sdk';
  import { ScyllaLoadingScreen } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { LoginState } from '@base/features/login';
  import { loginPoints } from '@base/features/login/presentation/login.points.ts';
  import AuthLayout from '../AuthLayout.svelte';
  import LoginForm from '../LoginForm/LoginForm.svelte';
  import { loginMessages } from '../login.messages.ts';

  // Built during initialisation: its mutation needs an owner.
  const state = new LoginState();
</script>

{#if state.isSuccess}
  <ScyllaLoadingScreen />
{:else}
  <AuthLayout title={t(loginMessages.title)} description={t(loginMessages.description)}>
    <LoginForm handleSubmit={state.submit} isPending={state.isPending} />

    {#snippet below()}
      <!-- No default content: a zone that only ever receives `after` components (e.g. a sign-up link). -->
      <WidgetZone point={loginPoints.footer} context={{ isPending: state.isPending }} />
    {/snippet}
  </AuthLayout>
{/if}
