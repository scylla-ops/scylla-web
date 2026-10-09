<script lang="ts">
  import { Button } from '@scylla/ui/shadcn';
  import { FormItemType, ScyllaForm, type FormItem } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import {
    checkNewPassword,
    checkPasswordConfirmation,
  } from '@shared/utils/account-validation.ts';
  import { userMessages } from '../user.messages.ts';

  interface Props {
    isPending: boolean;
    /** The message of the server, under the current password. */
    refusal?: string;
    onSubmit: (currentPassword: string, newPassword: string) => void;
  }

  let { isPending, refusal, onSubmit }: Props = $props();

  type Ids = 'currentPassword' | 'newPassword' | 'confirmPassword';

  const items: readonly FormItem<Ids>[] = $derived([
    {
      id: 'currentPassword',
      label: t(userMessages.currentPassword),
      type: FormItemType.Input,
      inputType: 'password',
      autocomplete: 'current-password',
    },
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
  errors={{ currentPassword: refusal }}
  onSubmit={values => onSubmit(values.currentPassword, values.newPassword)}
>
  {#snippet footer({ isValid, isPending: pending })}
    <div class="flex justify-end">
      <Button type="submit" disabled={!isValid || pending}>
        {t(userMessages.changePassword)}
      </Button>
    </div>
  {/snippet}
</ScyllaForm>
