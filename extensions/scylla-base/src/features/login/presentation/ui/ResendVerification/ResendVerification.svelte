<script lang="ts">
  import { Button } from '@scylla/ui/primitives';
  import { FormItemType, ScyllaForm, type FormItem } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { checkEmail } from '@shared/utils/account-validation.ts';
  import { signUpMessages } from '@base/features/login/presentation/messages/sign-up.messages.ts';
  import { verificationMessages } from '@base/features/login/presentation/messages/verification.messages.ts';
  import { ResendVerificationState } from './resend-verification.state.svelte.ts';

  interface Props {
    /** The email of the account. Without it, the person types the email. */
    email?: string;
  }

  let { email }: Props = $props();

  // Built during initialisation: its query and its mutation need an owner.
  const state = new ResendVerificationState();

  const resend = (): void => {
    if (email) state.send(email);
  };

  const items: readonly FormItem<'email'>[] = $derived([
    {
      id: 'email',
      label: t(signUpMessages.email),
      placeholder: t(signUpMessages.emailPlaceholder),
      type: FormItemType.Input,
      inputType: 'email',
      autocomplete: 'email',
      validate: checkEmail,
    },
  ]);
</script>

<!-- Where the mail comes from, and the button that sends a new link. -->
<div class="flex w-full flex-col items-center gap-3 text-center">
  <p class="text-sm text-muted-foreground">
    {state.sender ? t(verificationMessages.sender(state.sender)) : t(verificationMessages.spam)}
  </p>
  {#if email}
    <Button variant="outline" class="w-full" disabled={state.isPending} onclick={resend}>
      {t(verificationMessages.resend)}
    </Button>
  {:else}
    <!-- A form of the full width, with its label on the left as in the other forms. -->
    <div class="w-full text-left">
      <ScyllaForm {items} onSubmit={values => state.send(values.email)} isPending={state.isPending}>
        {#snippet footer({ isValid, isPending })}
          <Button type="submit" class="mt-2 w-full" disabled={!isValid || isPending}>
            {t(verificationMessages.resend)}
          </Button>
        {/snippet}
      </ScyllaForm>
    </div>
  {/if}
  {#if state.isSent}
    <p role="status" class="text-sm">
      {email ? t(verificationMessages.resent(email)) : t(verificationMessages.resentIfPending)}
    </p>
  {:else if state.isLimited}
    <p role="alert" class="text-sm text-destructive">{t(verificationMessages.limited)}</p>
  {/if}
</div>
