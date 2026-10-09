import { navigateTo, contextStore } from '@platform/context';
import { createMutation, createQuery } from '@scylla/core-sdk';
import { toRune } from '@scylla/ui/stores';
import type { FormValues } from '@scylla/ui';
import { slugifyOrgName } from '@shared/utils/slug.ts';
import { organizationMutations, organizationQueries } from '@base/features/organization';
import { syncMyPermissions } from '@base/features/roles';

/** Loads the user's organizations and keeps the permissions in sync with the context. Create it once, in `Layout`. */
export const createShellState = () => {
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
    createFirstOrganization: ({ name, description }: FormValues<'name' | 'description'>) => {
      if (!name.trim()) return;

      createOrganization.mutate(
        { name, description: description.trim() || undefined },
        { onSuccess: () => navigateTo(`/${slugifyOrgName(name)}/users/me`) },
      );
    },
  };
};

export type ShellState = ReturnType<typeof createShellState>;
