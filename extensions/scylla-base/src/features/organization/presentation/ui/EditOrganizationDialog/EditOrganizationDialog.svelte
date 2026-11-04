<script lang="ts">
  import { createMutation } from '@scylla/core-sdk';
  import {
    FormDialog,
    FormItemType,
    type FormItem,
    type FormValues,
  } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import {
    organizationMutations,
  } from '@base/features/organization/presentation/organization.queries.ts';
  import { organizationMessages } from '@base/features/organization/presentation/messages/organization.messages.ts';

  interface Props {
    open: boolean;
    setOpen: (open: boolean) => void;
    organization: { id: string; name: string; slug: string };
  }

  let { open, setOpen, organization }: Props = $props();

  const updateOrganization = createMutation(() => organizationMutations.update());

  const items: readonly FormItem<'name' | 'slug'>[] = $derived([
    {
      id: 'name',
      label: t(organizationMessages.organizationName),
      placeholder: organization.name,
      type: FormItemType.Input,
      inputType: 'text',
    },
    {
      id: 'slug',
      label: t(organizationMessages.slug),
      placeholder: organization.slug,
      type: FormItemType.Input,
      inputType: 'text',
    },
  ]);

  // Empty means "leave it alone": placeholders, not default values.
  const handleSubmit = ({ name, slug }: FormValues<'name' | 'slug'>) => {
    updateOrganization.mutate(
      {
        organizationId: organization.id,
        name: name.trim() || undefined,
        slug: slug.trim() || undefined,
      },
      { onSuccess: () => setOpen(false) },
    );
  };
</script>

<FormDialog
  {open}
  onOpenChange={setOpen}
  title={t(organizationMessages.editTitle)}
  description={t(organizationMessages.editDescription)}
  {items}
  isPending={updateOrganization.isPending}
  submitLabel={t(organizationMessages.save)}
  pendingLabel={t(organizationMessages.saving)}
  onSubmit={handleSubmit}
/>
