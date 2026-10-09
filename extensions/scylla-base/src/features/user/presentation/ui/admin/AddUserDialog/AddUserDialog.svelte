<script lang="ts">
  import { createMutation } from '@scylla/core-sdk';
  import { FormDialog, FormItemType, type FormItem, type FormValues } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import {
    checkDisplayName,
    checkEmail,
    checkNewPassword,
    checkPasswordConfirmation,
    checkUsername,
  } from '@shared/utils/account-validation.ts';
  import { userMutations } from '../../../user.queries.ts';
  import { userMessages } from '../../user.messages.ts';

  interface Props {
    open: boolean;
    setOpen: (open: boolean) => void;
  }

  let { open, setOpen }: Props = $props();

  const createUser = createMutation(() => userMutations.create());

  type Ids = 'email' | 'username' | 'displayName' | 'password' | 'confirmPassword';

  const items: readonly FormItem<Ids>[] = $derived([
    {
      id: 'email',
      label: t(userMessages.email),
      placeholder: t(userMessages.emailPlaceholder),
      type: FormItemType.Input,
      inputType: 'email',
      autocomplete: 'email',
      validate: checkEmail,
    },
    {
      id: 'username',
      label: t(userMessages.username),
      placeholder: t(userMessages.usernamePlaceholder),
      description: t(userMessages.usernameHint),
      type: FormItemType.Input,
      inputType: 'text',
      autocomplete: 'username',
      validate: checkUsername,
    },
    {
      id: 'displayName',
      label: t(userMessages.displayName),
      placeholder: t(userMessages.displayNamePlaceholder),
      type: FormItemType.Input,
      inputType: 'text',
      autocomplete: 'name',
      optional: true,
      validate: checkDisplayName,
    },
    {
      id: 'password',
      label: t(userMessages.password),
      placeholder: t(userMessages.passwordPlaceholder),
      type: FormItemType.Input,
      inputType: 'password',
      autocomplete: 'new-password',
      validate: checkNewPassword,
    },
    {
      id: 'confirmPassword',
      label: t(userMessages.confirmPassword),
      type: FormItemType.Input,
      inputType: 'password',
      autocomplete: 'new-password',
      validate: (value, values) => checkPasswordConfirmation(value, values.password),
    },
  ]);

  const handleSubmit = ({ email, username, displayName, password }: FormValues<Ids>) => {
    // Closes on success only: the dialog stays pending until the user exists.
    createUser.mutate(
      {
        email: email.trim(),
        username: username.trim(),
        password,
        displayName: displayName.trim() || undefined,
      },
      { onSuccess: () => setOpen(false) },
    );
  };
</script>

<FormDialog
  {open}
  onOpenChange={setOpen}
  title={t(userMessages.createTitle)}
  description={t(userMessages.createDescription)}
  {items}
  isPending={createUser.isPending}
  submitLabel={t(userMessages.createSubmit)}
  onSubmit={handleSubmit}
/>
