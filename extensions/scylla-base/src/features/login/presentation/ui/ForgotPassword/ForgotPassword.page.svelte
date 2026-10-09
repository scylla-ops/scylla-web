<script lang="ts">
  import { Button } from '@scylla/ui/shadcn';
  import { FormItemType, ScyllaForm, type FormItem } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { checkEmail } from '@shared/utils/account-validation.ts';
  import type { PasswordResetDelivery } from '../../../domain/structs/password-reset.struct.ts';
  import { ForgotPasswordState } from '../../forgot-password.state.svelte.ts';
  import AuthLayout from '../AuthLayout.svelte';
  import { passwordResetMessages } from '../password-reset.messages.ts';

  // Built during initialisation: its mutation needs an owner.
  const state = new ForgotPasswordState();

  const SENT = {
    mail: passwordResetMessages.sentByMail,
    'server-log': passwordResetMessages.sentToServerLog,
    unknown: passwordResetMessages.sentUnknown,
  } satisfies Record<PasswordResetDelivery, unknown>;

  const items: readonly FormItem<'email'>[] = $derived([
    {
      id: 'email',
      label: t(passwordResetMessages.email),
      placeholder: t(passwordResetMessages.emailPlaceholder),
      type: FormItemType.Input,
      inputType: 'email',
      autocomplete: 'email',
      validate: checkEmail,
    },
  ]);
</script>

<AuthLayout
  title={t(passwordResetMessages.forgotTitle)}
  description={state.delivery ? undefined : t(passwordResetMessages.forgotDescription)}
>
  {#if state.delivery}
    <p role="status" class="text-sm">{t(SENT[state.delivery])}</p>
  {:else}
    <ScyllaForm {items} onSubmit={values => state.submit(values.email)} isPending={state.isPending}>
      {#snippet footer({ isValid, isPending })}
        <Button type="submit" class="mt-2 w-full" disabled={!isValid || isPending}>
          {t(passwordResetMessages.sendLink)}
        </Button>
      {/snippet}
    </ScyllaForm>
  {/if}

  <a
    href="/login"
    class="mt-6 block text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
  >
    {t(passwordResetMessages.backToSignIn)}
  </a>
</AuthLayout>
