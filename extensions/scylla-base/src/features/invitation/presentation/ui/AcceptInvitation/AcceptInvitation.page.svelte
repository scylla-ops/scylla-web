<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import AuthLayout from '@shared/presentation/ui/layout/AuthLayout.svelte';
  import { AcceptInvitationState } from './accept-invitation.state.svelte.ts';
  import { invitationMessages } from '@base/features/invitation/presentation/messages/invitation.messages.ts';

  // Built during initialisation: it reads the token of the link, and its mutation needs an owner.
  const state = new AcceptInvitationState();
  onMount(() => void state.start());
</script>

<AuthLayout title={t(invitationMessages.acceptTitle)}>
  {#if state.step === 'invalid-link'}
    <p role="alert" class="text-center text-sm text-destructive">
      {t(invitationMessages.invalidLink)}
    </p>
  {:else if state.step === 'signed-out'}
    <p class="mb-6 text-center text-sm">{t(invitationMessages.signInFirst)}</p>
    <div class="flex flex-col gap-2">
      <Button href={state.signInHref} class="w-full">{t(invitationMessages.signIn)}</Button>
      <Button href={state.signUpHref} variant="outline" class="w-full">
        {t(invitationMessages.createAccount)}
      </Button>
    </div>
  {:else}
    <p role="status" class="text-center text-sm text-muted-foreground">
      {t(invitationMessages.accepting)}
    </p>
  {/if}
</AuthLayout>
