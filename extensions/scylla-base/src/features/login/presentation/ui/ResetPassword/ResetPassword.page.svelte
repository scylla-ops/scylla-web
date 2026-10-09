<script lang="ts">
  import { Button } from '@scylla/ui/shadcn';
  import { FormItemType, ScyllaForm, type FormItem } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import {
    checkNewPassword,
    checkPasswordConfirmation,
  } from '@shared/utils/account-validation.ts';
  import { ResetPasswordState } from '../../reset-password.state.svelte.ts';
  import AuthLayout from '../AuthLayout.svelte';
  import { passwordResetMessages } from '../password-reset.messages.ts';

  // Built during initialisation: it reads the token of the link, and its mutation needs an owner.
  const state = new ResetPasswordState();

  type Ids = 'newPassword' | 'confirmPassword';

  const items: readonly FormItem<Ids>[] = $derived([
    {
      id: 'newPassword',
      label: t(passwordResetMessages.newPassword),
      type: FormItemType.Input,
      inputType: 'password',
      autocomplete: 'new-password',
      validate: checkNewPassword,
    },
    {
      id: 'confirmPassword',
      label: t(passwordResetMessages.confirmPassword),
      type: FormItemType.Input,
      inputType: 'password',
      autocomplete: 'new-password',
      validate: (value, values) => checkPasswordConfirmation(value, values.newPassword),
    },
  ]);
</script>

<svelte:window onhashchange={state.readNewLink} />

<AuthLayout
  title={t(passwordResetMessages.resetTitle)}
  description={state.step === 'form' ? t(passwordResetMessages.resetDescription) : undefined}
>
  {#if state.step === 'done'}
    <p role="status" class="mb-6 text-sm">{t(passwordResetMessages.resetDone)}</p>
    <Button href="/login" class="w-full">{t(passwordResetMessages.signIn)}</Button>
  {:else if state.step === 'invalid-link'}
    <p role="alert" class="mb-6 text-sm text-destructive">{t(passwordResetMessages.invalidLink)}</p>
    <Button href="/forgot-password" variant="outline" class="w-full">
      {t(passwordResetMessages.newLink)}
    </Button>
  {:else}
    {#key state.link}
      <ScyllaForm
        {items}
        onSubmit={values => state.submit(values.newPassword)}
        isPending={state.isPending}
      >
        {#snippet footer({ isValid, isPending })}
          <Button type="submit" class="mt-2 w-full" disabled={!isValid || isPending}>
            {t(passwordResetMessages.changePassword)}
          </Button>
        {/snippet}
      </ScyllaForm>
    {/key}
  {/if}
</AuthLayout>
