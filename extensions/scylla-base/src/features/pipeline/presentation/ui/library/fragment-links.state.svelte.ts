import GitForkIcon from '@lucide/svelte/icons/git-fork';
import LayersIcon from '@lucide/svelte/icons/layers';
import LinkIcon from '@lucide/svelte/icons/link';
import { activeWorkspaceSlug, contextStore, workspaceUrl } from '@platform/context';
import { createQuery, type SecondSidebarLink, type SecondSidebarSearch } from '@scylla/core-sdk';
import { t } from '@scylla/ui/i18n';
import { toRune } from '@scylla/ui/stores';
import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';
import { fragmentQueries } from '@base/features/pipeline/presentation/fragment.queries.ts';

/** The Library link of `pipeline.module.ts`: its path is the id of the rail item. */
const LIBRARY_ITEM = 'library';

const ICONS = { linked: LinkIcon, forked: GitForkIcon } as const;

/** What the user typed in the search of the sidebar. The links and the field share it. */
const filter = $state({ query: '' });

const matches = (name: string): boolean =>
  name.toLowerCase().includes(filter.query.trim().toLowerCase());

/** The fragments of the library, after the Library link. It reads only while they show. */
export const fragmentLinks = (
  shown: () => string | undefined,
): (() => readonly SecondSidebarLink[]) => {
  const context = toRune(contextStore);
  const open = $derived(shown() === LIBRARY_ITEM);

  const fragments = createQuery(() => ({
    ...fragmentQueries.list(context().workspace.id),
    enabled: open && !!context().workspace.id,
  }));

  const links = $derived.by(() => {
    context(); // `activeWorkspaceSlug` reads the store once: this follows a switch of workspace.
    const slug = activeWorkspaceSlug();
    if (!open || !slug) return [];
    return [...(fragments.data ?? [])]
      .filter(fragment => matches(fragment.name))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(fragment => ({
        title: fragment.name,
        href: workspaceUrl(slug, `library/${fragment.id}`),
        icon: fragment.source ? ICONS[fragment.source.kind] : LayersIcon,
      }));
  });

  return () => links;
};

/** The search above the fragments of the sidebar. It shows only with the library. */
export const fragmentSearch = (
  shown: () => string | undefined,
): (() => SecondSidebarSearch | undefined) => {
  const open = $derived(shown() === LIBRARY_ITEM);
  const search = $derived<SecondSidebarSearch | undefined>(
    open
      ? {
          label: t(libraryMessages.filterFragments),
          placeholder: t(libraryMessages.filterFragments),
          value: filter.query,
          onchange: value => (filter.query = value),
        }
      : undefined,
  );
  return () => search;
};
