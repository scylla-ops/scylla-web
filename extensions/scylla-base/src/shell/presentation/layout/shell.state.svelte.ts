import { navigateTo, contextStore, organizationUrl } from '@platform/context';
import { createMutation, createQuery } from '@scylla/core-sdk';
import { toRune } from '@scylla/ui/stores';
import type { FormValues } from '@scylla/ui';
import { organizationMutations, organizationQueries } from '@base/features/organization';
import { syncMyPermissions } from '@base/features/access';

/** Loads the user's organizations and keeps the permissions in sync with the context. Create it once, in `Layout`. */
export const createShell = () => {
  const organizations = createQuery(() => organizationQueries.mine());
  const createOrganization = createMutation(() => organizationMutations.create());
  const context = toRune(contextStore);

  $effect(() => {
    const { organization, project } = context();
    syncMyPermissions(organization.id, project.id);
  });

  return {
    get isLoading() {
      return organizations.isLoading;
    },
    get hasOrganizations() {
      return (organizations.data?.length ?? 0) > 0;
    },
    get isCreating() {
      return createOrganization.isPending;
    },
    createFirstOrganization: ({ name, slug }: FormValues<'name' | 'slug'>) => {
      if (!name.trim()) return;

      createOrganization.mutate(
        { name: name.trim(), slug: slug.trim() || undefined },
        { onSuccess: workspace => navigateTo(organizationUrl(workspace.slug)) },
      );
    },
  };
};

export type Shell = ReturnType<typeof createShell>;
