<script lang="ts">
  import { Button } from '@scylla/ui/shadcn';
  import { FormItemType, ScyllaForm, type FormItem } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import {
    checkDisplayName,
    checkEmail,
    checkUsername,
  } from '@shared/utils/account-validation.ts';
  import type { ProfileValues, UserEntity } from '../../../../domain/entities/user.entity.ts';
  import { userMessages } from '../../user.messages.ts';

  interface Props {
    user: UserEntity;
    /** False: the email is read-only, with the reason under it. */
    emailEditable: boolean;
    /** False: every field is read-only and there is no save button. */
    canEdit?: boolean;
    isPending?: boolean;
    onSave: (values: ProfileValues) => void;
  }

  let { user, emailEditable, canEdit = true, isPending = false, onSave }: Props = $props();

  const items: readonly FormItem<keyof ProfileValues>[] = $derived([
    {
      id: 'displayName',
      label: t(userMessages.displayName),
      placeholder: t(userMessages.displayNamePlaceholder),
      type: FormItemType.Input,
      inputType: 'text',
      autocomplete: 'name',
      optional: true,
      readonly: !canEdit,
      validate: checkDisplayName,
      defaultValue: user.displayName ?? '',
    },
    {
      id: 'username',
      label: t(userMessages.username),
      description: t(userMessages.usernameHint),
      type: FormItemType.Input,
      inputType: 'text',
      autocomplete: 'username',
      readonly: !canEdit,
      validate: checkUsername,
      defaultValue: user.username,
    },
    {
      id: 'email',
      label: t(userMessages.email),
      description: emailEditable ? undefined : t(userMessages.emailReadOnly),
      type: FormItemType.Input,
      inputType: 'email',
      autocomplete: 'email',
      optional: !emailEditable,
      readonly: !canEdit || !emailEditable,
      validate: emailEditable ? checkEmail : undefined,
      defaultValue: user.email ?? '',
    },
  ]);
</script>

<!-- Keyed on the version of the user: the form seeds its values once. -->
{#key user.updatedAt}
  <ScyllaForm {items} {isPending} autofocus={false} onSubmit={onSave}>
    {#snippet footer({ isValid, isPending: pending })}
      {#if canEdit}
        <div class="flex justify-end">
          <Button type="submit" disabled={!isValid || pending}>{t(userMessages.save)}</Button>
        </div>
      {/if}
    {/snippet}
  </ScyllaForm>
{/key}
