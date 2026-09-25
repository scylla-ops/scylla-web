<script lang="ts">
  import { navigateTo } from '@platform/context';
  import { createMutation } from '@scylla/core-sdk';
  import { FormDialog, type FormValues } from '@scylla/ui';
  import {
    activeLocale,
    t,
  } from '@scylla/ui/i18n';
  import { slugifyOrgName } from '@shared/utils/slug.ts';
  import { organizationMutations } from '../../organization.queries.ts';
  import { createOrganizationItems } from '../../utils/create-organization-form-items.ts';
  import { organizationMessages } from '../organization.messages.ts';

  interface Props {
    open: boolean;
    setOpen: (open: boolean) => void;
    hideCancel?: boolean;
  }

  let { open, setOpen, hideCancel = false }: Props = $props();

  const createOrganization = createMutation(() => organizationMutations.create());

  // Reading the locale rebuilds the labels on a switch.
  const items = $derived((activeLocale(), createOrganizationItems()));

  const handleSubmit = ({ name, description }: FormValues<'name' | 'description'>) => {
    if (!name.trim()) return;

    createOrganization.mutate(
      { name, description: description.trim() || undefined },
      {
        // The mutation already made it active; where to land is the caller's choice.
        onSuccess: () => {
          setOpen(false);
          navigateTo(`/${slugifyOrgName(name)}/projects`);
        },
      },
    );
  };
</script>

<FormDialog
  {open}
  onOpenChange={setOpen}
  title={t(organizationMessages.createTitle)}
  description={t(organizationMessages.createDescription)}
  {items}
  isPending={createOrganization.isPending}
  submitLabel={t(organizationMessages.createSubmit)}
  onSubmit={handleSubmit}
  {hideCancel}
/>
