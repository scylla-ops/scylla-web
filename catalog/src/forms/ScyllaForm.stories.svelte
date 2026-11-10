<script module lang="ts">
  import { FormItemType, ScyllaForm, type FormItem } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  type Ids = 'name' | 'email' | 'plan' | 'token';

  const ITEMS: readonly FormItem<Ids>[] = [
    {
      id: 'name',
      type: FormItemType.Input,
      inputType: 'text',
      label: 'Name',
      placeholder: 'Ada Lovelace',
      autocomplete: 'name',
    },
    {
      id: 'email',
      type: FormItemType.Input,
      inputType: 'email',
      label: 'Email',
      autocomplete: 'email',
      description: 'We send the invitation there.',
      // A plain descriptor: the `msg` macro compiles in `.ts` files only.
      validate: value =>
        value.includes('@') ? undefined : { id: 'catalog.email', message: 'Enter an email address.' },
    },
    {
      id: 'plan',
      type: FormItemType.Select,
      label: 'Plan',
      placeholder: 'Pick one',
      options: [
        { label: 'Free', value: 'free' },
        { label: 'Pro', value: 'pro' },
      ],
    },
    {
      id: 'token',
      type: FormItemType.Input,
      inputType: 'text',
      label: 'Token',
      defaultValue: 'sk_live_51H8x2dLkq9',
      readonly: true,
      optional: true,
    },
  ];

  const FILLED: readonly FormItem<Ids>[] = ITEMS.map(item => ({
    ...item,
    defaultValue: { name: 'Ada', email: 'ada', plan: 'pro', token: item.defaultValue }[item.id],
  }));

  const DISABLED: readonly FormItem<Ids>[] = ITEMS.map(item => ({ ...item, disabled: true }));

  const { Story } = defineMeta({ title: 'Forms/ScyllaForm', component: ScyllaForm });
</script>

<Story name="Cases" asChild>
  <div class="grid max-w-4xl grid-cols-1 gap-10 md:grid-cols-2">
    <Specimen label="empty: submit disabled" class="w-full">
      <ScyllaForm items={ITEMS} onSubmit={() => {}} buttonLabel="Invite" autofocus={false} class="w-full" />
    </Specimen>
    <Specimen label="error from the server" class="w-full">
      <ScyllaForm
        items={FILLED}
        onSubmit={() => {}}
        errors={{ name: 'This name is already taken.' }}
        buttonLabel="Invite"
        autofocus={false}
        class="w-full"
      />
    </Specimen>
    <Specimen label="pending" class="w-full">
      <ScyllaForm items={FILLED} onSubmit={() => {}} isPending buttonLabel="Invite" autofocus={false} class="w-full" />
    </Specimen>
    <Specimen label="disabled fields" class="w-full">
      <ScyllaForm items={DISABLED} onSubmit={() => {}} buttonLabel="Invite" autofocus={false} class="w-full" />
    </Specimen>
  </div>
</Story>
