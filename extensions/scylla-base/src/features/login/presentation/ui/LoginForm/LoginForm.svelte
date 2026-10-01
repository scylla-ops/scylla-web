<script lang="ts">
  import { Button } from '@scylla/ui/shadcn';
  import { ScyllaForm, FormItemType, type FormItem } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { loginPoints } from '../../login.points.ts';

  interface Props {
    handleSubmit: (login: string, password: string) => void;
    isPending?: boolean;
  }

  let { handleSubmit, isPending = false }: Props = $props();

  const items = $derived(
    loginPoints.fields.resolve([
      {
        id: 'identifier',
        label: t(loginPoints.texts.messages.identifier),
        placeholder: t(loginPoints.texts.messages.identifierPlaceholder),
        type: FormItemType.Input,
        inputType: 'text',
      },
      {
        id: 'password',
        label: t(loginPoints.texts.messages.password),
        placeholder: t(loginPoints.texts.messages.passwordPlaceholder),
        type: FormItemType.Input,
        inputType: 'password',
      },
    ] satisfies readonly FormItem<'identifier' | 'password'>[]),
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
      {t(loginPoints.texts.messages.submit)}
    </Button>
  {/snippet}
</ScyllaForm>
