<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Card, CardContent, CardHeader, CardTitle } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { ChangeEmailState } from './change-email.state.svelte.ts';
  import { userMessages } from '@base/features/user/presentation/messages/user.messages.ts';

  // Built during initialisation: it reads the token of the link, and its mutation needs an owner.
  const state = new ChangeEmailState();
  onMount(state.start);
</script>

<div class="flex justify-center p-6">
  <Card class="w-full max-w-sm">
    <CardHeader>
      <CardTitle><h1>{t(userMessages.confirmEmailTitle)}</h1></CardTitle>
    </CardHeader>
    <CardContent class="flex flex-col gap-4">
      {#if state.step === 'done'}
        <p role="status" class="text-sm">{t(userMessages.emailChanged(state.email))}</p>
      {:else if state.step === 'invalid-link'}
        <p role="alert" class="text-sm text-destructive">{t(userMessages.invalidEmailLink)}</p>
      {:else}
        <p role="status" class="text-sm text-muted-foreground">{t(userMessages.confirmingEmail)}</p>
      {/if}
      {#if state.step !== 'confirming'}
        <Button href="/account/security" variant="outline">{t(userMessages.backToAccount)}</Button>
      {/if}
    </CardContent>
  </Card>
</div>
