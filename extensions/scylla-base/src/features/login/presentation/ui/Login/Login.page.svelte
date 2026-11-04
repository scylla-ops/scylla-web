<script lang="ts">
  import { createQuery, WidgetZone } from '@scylla/core-sdk';
  import { ScyllaLoadingScreen } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { LoginState } from '@base/features/login';
  import { loginPoints } from '@base/features/login/presentation/login.points.ts';
  import { loginQueries } from '@base/features/login/presentation/login.queries.ts';
  import { returnPathOf } from '@base/features/login/presentation/mappers/return-path.mapper.ts';
  import AuthLayout from '../AuthLayout.svelte';
  import LoginForm from '../LoginForm/LoginForm.svelte';
  import SignInProviders from '../SignInProviders/SignInProviders.svelte';
  import { loginMessages } from '@base/features/login/presentation/messages/login.messages.ts';
  import { signUpMessages } from '@base/features/login/presentation/messages/sign-up.messages.ts';

  // Built during initialisation: its mutation needs an owner.
  const state = new LoginState();
  const methods = createQuery(() => loginQueries.signInMethods());
  const returnPath = returnPathOf(window.location.hash) ?? '/';
</script>

{#if state.isSuccess}
  <ScyllaLoadingScreen />
{:else}
  <AuthLayout title={t(loginMessages.title)} description={t(loginMessages.description)}>
    <LoginForm handleSubmit={state.submit} isPending={state.isPending} />
    <SignInProviders providers={methods.data?.providers ?? []} {returnPath} />

    {#snippet below()}
      {#if methods.data?.signUpMode === 'open'}
        <a
          href="/sign-up"
          class="mt-6 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {t(signUpMessages.noAccount)}
        </a>
      {/if}
      <!-- No default content: a zone that only ever receives `after` components. -->
      <WidgetZone point={loginPoints.footer} context={{ isPending: state.isPending }} />
    {/snippet}
  </AuthLayout>
{/if}
