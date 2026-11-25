import { createMutation, createQuery } from '@scylla/core-sdk';
import { toRune } from '@scylla/ui/stores';
import { Permission, can } from '@platform/authz';
import { contextStore, createSearchParams, scyllaNavigate } from '@platform/context';
import { fragmentQueries } from '@base/features/pipeline';
import {
  marketplaceMutations,
  marketplaceQueries,
} from '@base/features/marketplace/presentation/marketplace.queries.ts';
import { libraryStatus } from '@base/features/marketplace/presentation/presenters/library-status.presenter.ts';

const context = toRune(contextStore);

/** How the add dialog opens: on the linked choice, or on the fork. */
export type AddMode = 'linked' | 'forked';

/** The tabs of the page. The first one is the default, which the URL does not name. */
const PACKAGE_TABS = ['overview', 'versions', 'readme'] as const;
export type PackageTab = (typeof PACKAGE_TABS)[number];

/**
 * The page of a package: the package, where it stands in the library, the star of the reader,
 * the add dialog, and the open tab, which is in the URL (`?tab=readme`) so that a copied link
 * opens it.
 */
export const createPackagePage = (packageId: () => string) => {
  const workspace = $derived(context().workspace);
  const fragmentsQuery = createQuery(() => fragmentQueries.list(workspace.id));
  const fragments = $derived(fragmentsQuery.data ?? []);

  const packageQuery = createQuery(() => ({
    ...marketplaceQueries.byId(packageId()),
    enabled: !!packageId(),
  }));
  const star = createMutation(() => marketplaceMutations.setStar());

  const pkg = $derived(packageQuery.data);
  const status = $derived(pkg ? libraryStatus(pkg, fragments) : { kind: 'none' as const });

  let adding = $state<AddMode | null>(null);

  const search = createSearchParams(['tab']);
  const tab = $derived<PackageTab>(
    PACKAGE_TABS.find(known => known === search.values.tab) ?? 'overview',
  );

  return {
    get isLoading() {
      return fragmentsQuery.isLoading || packageQuery.isLoading;
    },
    get pkg() {
      return pkg;
    },
    get status() {
      return status;
    },
    get workspaceName() {
      return workspace.name ?? '';
    },
    get fragmentNames() {
      return fragments.map(fragment => fragment.name);
    },
    /** A fragment in the library is in every pipeline editor: as saving one from the editor. */
    get canAdd() {
      return status.kind === 'none' && can(Permission.UPDATE_PIPELINE);
    },
    /** A package of the workspace is starred by the others only. */
    get canStar() {
      return status.kind !== 'own' && !star.isPending;
    },
    get adding() {
      return adding;
    },
    set adding(next: AddMode | null) {
      adding = next;
    },
    get tab() {
      return tab;
    },
    selectTab(next: string) {
      search.write({ tab: next === PACKAGE_TABS[0] ? '' : next });
    },

    toggleStar() {
      if (pkg && status.kind !== 'own') star.mutate({ id: pkg.id, starred: !pkg.starred });
    },
    openInLibrary() {
      if (status.kind !== 'none')
        scyllaNavigate.goToWorkspaceRoute(`library/${status.fragment.id}`);
    },
  };
};

export type PackagePage = ReturnType<typeof createPackagePage>;
