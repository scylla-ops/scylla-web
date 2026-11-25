<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { VerifyEmailState } from './verify-email.state.svelte.ts';
  import AuthLayout from '@shared/presentation/ui/layout/AuthLayout.svelte';
  import { LegalFooter } from '@platform/legal';
  import { signUpMessages } from '@base/features/login/presentation/messages/sign-up.messages.ts';
  import { passwordResetMessages } from '@base/features/login/presentation/messages/password-reset.messages.ts';
  import ResendVerification from '../ResendVerification/ResendVerification.svelte';

  // Built during initialisation: it reads the token of the link, and its mutation needs an owner.
  const state = new VerifyEmailState();
  onMount(state.start);
</script>

<!-- The legal links that the operator turned on, at the bottom of the frame. -->
{#snippet legalFooter()}
  <LegalFooter class="pt-6" />
{/snippet}

<AuthLayout footer={legalFooter} title={t(signUpMessages.verifyTitle)}>
  {#if state.step === 'done'}
    <p role="status" class="mb-6 text-center text-sm">{t(signUpMessages.verified)}</p>
    <Button href="/login" class="w-full">{t(signUpMessages.signIn)}</Button>
  {:else if state.step === 'invalid-link'}
    <p role="alert" class="mb-6 text-center text-sm text-destructive">
      {t(signUpMessages.invalidLink)}
    </p>
    <ResendVerification />
    <a
      href="/login"
      class="mt-6 block text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
    >
      {t(passwordResetMessages.backToSignIn)}
    </a>
  {:else}
    <p role="status" class="text-center text-sm text-muted-foreground">
      {t(signUpMessages.verifying)}
    </p>
  {/if}
</AuthLayout>
