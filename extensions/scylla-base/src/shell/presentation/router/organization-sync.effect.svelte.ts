import { untrack } from 'svelte';
import { navigateTo, contextStore, organizationUrl } from '@platform/context';
import { createQuery } from '@scylla/core-sdk';
import { organizationQueries } from '@base/features/organization';

/** When no organization matches the slug, goes to the projects of the first workspace. */
export const syncOrganization = (organizationSlug: string | undefined): void => {
  const organizations = createQuery(() => organizationQueries.mine());

  $effect(() => {
    const list = organizations.data;
    if (!organizationSlug || organizations.isLoading || !list) return;

    untrack(() => {
      const store = contextStore.getState();
      const match = list.find(organization => organization.slug === organizationSlug);

      if (match) {
        const { organization } = store;
        if (match.id !== organization.id || match.slug !== organization.slug)
          store.setOrganization(match.id, match.name, match.slug);
        return;
      }

      const fallback = list[0];
      if (!fallback) return;

      navigateTo(organizationUrl(fallback.slug), { replace: true });
      store.setOrganization(fallback.id, fallback.name, fallback.slug);
    });
  });
};
