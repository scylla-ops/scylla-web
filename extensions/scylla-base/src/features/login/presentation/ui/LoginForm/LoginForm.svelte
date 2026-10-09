<script lang="ts">
  import { Button } from '@scylla/ui/shadcn';
  import { ScyllaForm, FormItemType } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { loginPoints } from '../../login.points.ts';
  import { loginMessages } from '../login.messages.ts';

  interface Props {
    handleSubmit: (identifier: string, password: string) => void;
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
        autocomplete: 'username',
      },
      {
        id: 'password',
        label: t(loginMessages.password),
        placeholder: t(loginMessages.passwordPlaceholder),
        type: FormItemType.Input,
        inputType: 'password',
        autocomplete: 'current-password',
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
    <!-- Right under the password field. -->
    <div class="-mt-2 flex justify-end">
      <a
        href="/forgot-password"
        class="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        {t(loginMessages.forgotPassword)}
      </a>
    </div>
    <Button type="submit" class="mt-2 w-full" disabled={!isValid || pending}>
      {t(loginMessages.submit)}
    </Button>
  {/snippet}
</ScyllaForm>
