<script lang="ts">
  import { Button } from '@scylla/ui/primitives';
  import { FormItemType, ScyllaForm, type FormItem } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import {
    checkNewPassword,
    checkPasswordConfirmation,
  } from '@shared/utils/account-validation.ts';
  import { userMessages } from '@base/features/user/presentation/messages/user.messages.ts';

  interface Props {
    /** False: the account has no password yet, so the form sets a first one. */
    hasPassword: boolean;
    isPending: boolean;
    /** The message of the server, under the current password. */
    refusal?: string;
    onSubmit: (currentPassword: string, newPassword: string) => void;
  }

  let { hasPassword, isPending, refusal, onSubmit }: Props = $props();

  type Ids = 'currentPassword' | 'newPassword' | 'confirmPassword';

  const items: readonly FormItem<Ids>[] = $derived([
    ...(hasPassword
      ? [
          {
            id: 'currentPassword' as const,
            label: t(userMessages.currentPassword),
            type: FormItemType.Input as const,
            inputType: 'password' as const,
            autocomplete: 'current-password' as const,
          },
        ]
      : []),
    {
      id: 'newPassword',
      label: t(userMessages.newPassword),
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
      validate: (value, values) => checkPasswordConfirmation(value, values.newPassword),
    },
  ]);
</script>

<ScyllaForm
  {items}
  {isPending}
  autofocus={false}
  errors={hasPassword ? { currentPassword: refusal } : { newPassword: refusal }}
  onSubmit={values => onSubmit(values.currentPassword ?? '', values.newPassword)}
>
  {#snippet footer({ isValid, isPending: pending })}
    <div data-slot="form-actions" class="flex justify-end">
      <Button type="submit" disabled={!isValid || pending}>
        {t(hasPassword ? userMessages.changePassword : userMessages.setPassword)}
      </Button>
    </div>
  {/snippet}
</ScyllaForm>
