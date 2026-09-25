import { navigateTo, contextStore } from '@platform/context';
import { createQuery } from '@scylla/core-sdk';
import { toRune } from '@scylla/ui/stores';
import { slugifyOrgName } from '@shared/utils/slug.ts';
import { organizationQueries } from '@base/features/organization';

/** With no organization, stays: the layout shows the welcome screen. */
export const redirectToOrganization = (): void => {
  const organizations = createQuery(() => organizationQueries.mine());
  const context = toRune(contextStore);
  let done = false;

  $effect(() => {
    if (done || organizations.isLoading) return;

    const name = context().organization.name ?? organizations.data?.[0]?.name;
    if (!name) return;

    done = true;
    navigateTo(`/${slugifyOrgName(name)}/dashboard`, { replace: true });
  });
};
