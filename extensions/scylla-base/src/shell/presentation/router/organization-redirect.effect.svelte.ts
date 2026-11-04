import { activeWorkspaceSlug, navigateTo, organizationUrl } from '@platform/context';
import { createQuery } from '@scylla/core-sdk';
import { organizationQueries } from '@base/features/organization';

/** With no organization, stays: the layout shows the welcome screen. */
export const redirectToOrganization = (): void => {
  const organizations = createQuery(() => organizationQueries.mine());
  let done = false;

  $effect(() => {
    if (done || organizations.isLoading) return;

    const slug = activeWorkspaceSlug() ?? organizations.data?.[0]?.slug;
    if (!slug) return;

    done = true;
    navigateTo(organizationUrl(slug), { replace: true });
  });
};
