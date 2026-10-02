<script lang="ts">
  import { Button } from '@scylla/ui/shadcn';
  import { ScyllaForm, FormItemType } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { loginPoints } from '../../login.points.ts';
  import { loginMessages } from '../login.messages.ts';

  interface Props {
    handleSubmit: (login: string, password: string) => void;
    isPending?: boolean;
  }

  let { handleSubmit, isPending = false }: Props = $props();

  const items = $derived(
    loginPoints.fields.resolve([
      {
        id: 'identifier',
        label: t(loginMessages.identifier),
        placeholder: t(loginMessages.identifierPlaceholder),
        type: FormItemType.Input,
        inputType: 'text',
      },
      {
        id: 'password',
        label: t(loginMessages.password),
        placeholder: t(loginMessages.passwordPlaceholder),
        type: FormItemType.Input,
        inputType: 'password',
      },
    ]),
  );
</script>

<ScyllaForm
  {items}
  class="gap-4"
  onSubmit={values => handleSubmit(values.identifier, values.password)}
  {isPending}
>
  {#snippet footer({ isValid, isPending: pending })}
    <Button type="submit" class="mt-2 w-full" disabled={!isValid || pending}>
      {t(loginMessages.submit)}
    </Button>
  {/snippet}
</ScyllaForm>
