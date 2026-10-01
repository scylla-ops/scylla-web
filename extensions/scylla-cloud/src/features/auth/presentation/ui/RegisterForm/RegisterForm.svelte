<script lang="ts">
  import { Button } from '@scylla/ui/shadcn';
  import { ScyllaForm, FormItemType, type FormItem } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import type { SignupInput } from '../../../domain/repository/registration.repository.ts';
  import { registerMessages } from '../register.messages.ts';

  type FieldId = 'username' | 'email' | 'password' | 'organizationName';

  interface Props {
    handleSubmit: (input: SignupInput) => void;
    isPending?: boolean;
  }

  let { handleSubmit, isPending = false }: Props = $props();

  const items: readonly FormItem<FieldId>[] = $derived([
    {
      id: 'username',
      label: t(registerMessages.username),
      placeholder: t(registerMessages.usernamePlaceholder),
      type: FormItemType.Input,
      inputType: 'text',
    },
    {
      id: 'email',
      label: t(registerMessages.email),
      placeholder: t(registerMessages.emailPlaceholder),
      type: FormItemType.Input,
      inputType: 'email',
    },
    {
      id: 'password',
      label: t(registerMessages.password),
      placeholder: t(registerMessages.passwordPlaceholder),
      type: FormItemType.Input,
      inputType: 'password',
      // The server's own rule (8 to 255 characters); it stays the real check.
      pattern: '^.{8,255}$',
    },
    {
      id: 'organizationName',
      label: t(registerMessages.organizationName),
      placeholder: t(registerMessages.organizationNamePlaceholder),
      type: FormItemType.Input,
      inputType: 'text',
    },
  ]);
</script>

<ScyllaForm
  {items}
  class="gap-4"
  onSubmit={values =>
    handleSubmit({
      username: values.username,
      email: values.email,
      password: values.password,
      organizationName: values.organizationName,
    })}
  {isPending}
>
  {#snippet footer({ isValid, isPending: pending })}
    <Button type="submit" class="mt-2 w-full" disabled={!isValid || pending}>
      {t(registerMessages.submit)}
    </Button>
  {/snippet}
</ScyllaForm>
