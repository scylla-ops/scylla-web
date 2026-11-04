<script lang="ts">
  import { onMount } from 'svelte';
  import LogoScylla from '@scylla/ui/assets/logo_scylla.svg';
  import { Button, Card, CardContent, CardHeader, CardTitle } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { AcceptInvitationState } from './accept-invitation.state.svelte.ts';
  import { invitationMessages } from '@base/features/invitation/presentation/messages/invitation.messages.ts';

  // Built during initialisation: it reads the token of the link, and its mutation needs an owner.
  const state = new AcceptInvitationState();
  onMount(() => void state.start());
</script>

<div class="flex min-h-svh flex-col items-center justify-center p-6">
  <img src={LogoScylla} alt="Scylla" class="mb-8 w-56" />
  <Card class="w-full max-w-sm">
    <CardHeader>
      <CardTitle><h1>{t(invitationMessages.acceptTitle)}</h1></CardTitle>
    </CardHeader>
    <CardContent>
      {#if state.step === 'invalid-link'}
        <p role="alert" class="text-sm text-destructive">{t(invitationMessages.invalidLink)}</p>
      {:else if state.step === 'signed-out'}
        <p class="mb-6 text-sm">{t(invitationMessages.signInFirst)}</p>
        <div class="flex flex-col gap-2">
          <Button href={state.signInHref} class="w-full">{t(invitationMessages.signIn)}</Button>
          <Button href={state.signUpHref} variant="outline" class="w-full">
            {t(invitationMessages.createAccount)}
          </Button>
        </div>
      {:else}
        <p role="status" class="text-sm text-muted-foreground">{t(invitationMessages.accepting)}</p>
      {/if}
    </CardContent>
  </Card>
</div>
