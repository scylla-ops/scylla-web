<script lang="ts">
  import { Button } from '@scylla/ui/primitives';
  import { FormItemType, ScyllaForm, type FormItem } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import {
    checkDisplayName,
    checkEmail,
    checkNewPassword,
    checkPasswordConfirmation,
  } from '@shared/utils/account-validation.ts';
  import { SignUpState } from './sign-up.state.svelte.ts';
  import AuthLayout from '../AuthLayout.svelte';
  import { signUpMessages } from '@base/features/login/presentation/messages/sign-up.messages.ts';

  // Built during initialisation: it reads the invitation of the link, and its mutation needs an owner.
  const state = new SignUpState();

  type Ids = 'displayName' | 'email' | 'password' | 'confirmPassword';

  const items: readonly FormItem<Ids>[] = $derived([
    {
      id: 'displayName',
      label: t(signUpMessages.displayName),
      placeholder: t(signUpMessages.displayNamePlaceholder),
      type: FormItemType.Input,
      inputType: 'text',
      autocomplete: 'name',
      validate: checkDisplayName,
    },
    {
      id: 'email',
      label: t(signUpMessages.email),
      placeholder: t(signUpMessages.emailPlaceholder),
      type: FormItemType.Input,
      inputType: 'email',
      autocomplete: 'email',
      validate: checkEmail,
    },
    {
      id: 'password',
      label: t(signUpMessages.password),
      type: FormItemType.Input,
      inputType: 'password',
      autocomplete: 'new-password',
      validate: checkNewPassword,
    },
    {
      id: 'confirmPassword',
      label: t(signUpMessages.confirmPassword),
      type: FormItemType.Input,
      inputType: 'password',
      autocomplete: 'new-password',
      validate: (value, values) => checkPasswordConfirmation(value, values.password),
    },
  ]);
</script>

<AuthLayout
  title={t(signUpMessages.title)}
  description={state.isSent ? undefined : t(signUpMessages.description)}
>
  {#if state.isSent}
    <p role="status" class="text-center text-sm">{t(signUpMessages.sent)}</p>
  {:else}
    <ScyllaForm {items} onSubmit={state.submit} isPending={state.isPending}>
      {#snippet footer({ isValid, isPending })}
        <Button type="submit" class="mt-2 w-full" disabled={!isValid || isPending}>
          {t(signUpMessages.submit)}
        </Button>
      {/snippet}
    </ScyllaForm>
  {/if}

  <a
    href="/login"
    class="mt-6 block text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
  >
    {t(signUpMessages.haveAccount)}
  </a>
</AuthLayout>
