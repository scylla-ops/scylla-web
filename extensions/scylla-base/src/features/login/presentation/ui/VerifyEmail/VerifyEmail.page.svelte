<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { VerifyEmailState } from './verify-email.state.svelte.ts';
  import AuthLayout from '../AuthLayout.svelte';
  import { signUpMessages } from '@base/features/login/presentation/messages/sign-up.messages.ts';

  // Built during initialisation: it reads the token of the link, and its mutation needs an owner.
  const state = new VerifyEmailState();
  onMount(state.start);
</script>

<AuthLayout title={t(signUpMessages.verifyTitle)}>
  {#if state.step === 'done'}
    <p role="status" class="mb-6 text-center text-sm">{t(signUpMessages.verified)}</p>
    <Button href="/login" class="w-full">{t(signUpMessages.signIn)}</Button>
  {:else if state.step === 'invalid-link'}
    <p role="alert" class="mb-6 text-center text-sm text-destructive">
      {t(signUpMessages.invalidLink)}
    </p>
    <Button href="/sign-up" variant="outline" class="w-full">{t(signUpMessages.title)}</Button>
  {:else}
    <p role="status" class="text-center text-sm text-muted-foreground">
      {t(signUpMessages.verifying)}
    </p>
  {/if}
</AuthLayout>
