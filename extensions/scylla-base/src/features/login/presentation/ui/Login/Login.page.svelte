<script lang="ts">
  import { createQuery, WidgetZone } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import { LoginState } from '@base/features/login';
  import { loginPoints } from '@base/features/login/presentation/login.points.ts';
  import { loginQueries } from '@base/features/login/presentation/login.queries.ts';
  import { returnPathOf } from '@base/features/login/presentation/mappers/return-path.mapper.ts';
  import AuthLayout from '@shared/presentation/ui/layout/AuthLayout.svelte';
  import { LegalFooter } from '@platform/legal';
  import LoginForm from '../LoginForm/LoginForm.svelte';
  import ResendVerification from '../ResendVerification/ResendVerification.svelte';
  import SignInProviders from '../SignInProviders/SignInProviders.svelte';
  import { loginMessages } from '@base/features/login/presentation/messages/login.messages.ts';
  import { signUpMessages } from '@base/features/login/presentation/messages/sign-up.messages.ts';
  import { verificationMessages } from '@base/features/login/presentation/messages/verification.messages.ts';

  // Built during initialisation: its mutation needs an owner.
  const state = new LoginState();
  const methods = createQuery(() => loginQueries.signInMethods());
  const returnPath = returnPathOf(window.location.hash) ?? '/';
</script>

<!-- The legal links that the operator turned on, at the bottom of the frame. -->
{#snippet legalFooter()}
  <LegalFooter class="pt-6" />
{/snippet}

<!-- After the sign-in, the page stays under the arrival of `ArrivalOverlay` until the app opens. -->
<AuthLayout
  footer={legalFooter}
  title={t(loginMessages.title)}
  description={t(loginMessages.description)}
  mark={state.mark}
  leaving={state.isLeaving}
>
  <!-- A right password of an account that waits for the check of its email: no toast, a new link. -->
  {#if state.emailNotVerified}
    <div class="mb-6 flex flex-col items-center gap-3 rounded-md border p-4 text-center">
      <p role="alert" class="text-sm font-medium">{t(verificationMessages.notVerified)}</p>
      <ResendVerification email={state.unverifiedEmail} />
    </div>
  {/if}
  <LoginForm handleSubmit={state.submit} isPending={state.isPending} />
  <SignInProviders providers={methods.data?.providers ?? []} {returnPath} />

  {#snippet below()}
    {#if methods.data?.signUpMode === 'open'}
      <a
        href="/sign-up"
        class="mt-6 text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        {t(signUpMessages.noAccount)}
      </a>
    {/if}
    <!-- No default content: a zone that only ever receives `after` components. -->
    <WidgetZone point={loginPoints.footer} context={{ isPending: state.isPending }} />
  {/snippet}
</AuthLayout>
