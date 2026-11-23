import GitForkIcon from '@lucide/svelte/icons/git-fork';
import LayersIcon from '@lucide/svelte/icons/layers';
import LinkIcon from '@lucide/svelte/icons/link';
import { activeWorkspaceSlug, contextStore, workspaceUrl } from '@platform/context';
import { createQuery, type SecondSidebarLink } from '@scylla/core-sdk';
import { toRune } from '@scylla/ui/stores';
import { fragmentQueries } from '@base/features/pipeline/presentation/fragment.queries.ts';

/** The Library link of `pipeline.module.ts`: its path is the id of the rail item. */
const LIBRARY_ITEM = 'library';

const ICONS = { linked: LinkIcon, forked: GitForkIcon } as const;

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
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(fragment => ({
        title: fragment.name,
        href: workspaceUrl(slug, `library/${fragment.id}`),
        icon: fragment.source ? ICONS[fragment.source.kind] : LayersIcon,
      }));
  });

  return () => links;
};
