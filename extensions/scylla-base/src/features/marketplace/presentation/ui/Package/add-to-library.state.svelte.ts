import type { AddCommunityFragmentInput, FragmentAuthor } from '@base/features/pipeline';
import {
  addableVersions,
  fragmentVersionOf,
  versionsAfter,
  type MarketPackage,
} from '@base/features/marketplace/domain/entities/market-package.entity.ts';
import { secretKeys } from '@base/features/marketplace/presentation/presenters/package.presenter.ts';
import type { AddMode } from './package-page.state.svelte.ts';

/**
 * The form of the add dialog: linked or forked, which version, under which name. A linked
 * fragment gets the versions after the chosen one as upstream versions to review.
 */
export const createAddToLibrary = (
  pkg: MarketPackage,
  initialMode: AddMode,
  takenNames: readonly string[],
) => {
  const choices = addableVersions(pkg);
  let mode = $state(initialMode);
  let version = $state(choices[0]?.number ?? 0);
  let name = $state(pkg.name);

  const chosen = $derived(choices.find(entry => entry.number === version));
  const trimmed = $derived(name.trim());

  return {
    /** The latest first. */
    choices,
    get mode() {
      return mode;
    },
    set mode(next: AddMode) {
      mode = next;
    },
    get version() {
      return version;
    },
    set version(next: number) {
      version = next;
    },
    get name() {
      return name;
    },
    set name(next: string) {
      name = next;
    },
    get nameTaken() {
      return takenNames.includes(trimmed);
    },
    get secrets() {
      return chosen ? secretKeys(chosen) : [];
    },
    get ready() {
      return !!chosen && !!trimmed && !takenNames.includes(trimmed);
    },

    input(workspaceId: string, author: FragmentAuthor): AddCommunityFragmentInput | null {
      if (!chosen) return null;
      return {
        workspaceId,
        mode,
        name: trimmed,
        description: pkg.description,
        tags: pkg.tags,
        package: {
          packageId: pkg.id,
          publisher: pkg.publisher.handle,
          name: pkg.name,
          verified: pkg.publisher.verified,
        },
        version: fragmentVersionOf(chosen),
        newer: versionsAfter(pkg, chosen.number).map(fragmentVersionOf),
        author,
      };
    },
  };
};

export type AddToLibraryForm = ReturnType<typeof createAddToLibrary>;
