import type {
  FragmentEntity,
  PublishToMarketplaceInput,
} from '@base/features/pipeline/domain/entities/fragment.entity.ts';
import {
  MARKETPLACE_CATEGORIES,
  PUBLICATION_LICENSES,
  publicName,
} from '@base/features/pipeline/domain/structs/fragment-publication.struct.ts';
import {
  canGoPublic,
  publicationChecks,
} from '@base/features/pipeline/domain/structs/publication-check.struct.ts';

/**
 * The form of the publish dialog: the version, its license and shelf, and the checks that the
 * version passes. A fragment already public keeps its name, license and shelf as defaults.
 */
export const createPublishForm = (
  fragment: FragmentEntity,
  scope: string,
  initialVersion: number,
) => {
  const publication = fragment.publication;
  let version = $state(initialVersion);
  let license = $state(publication?.license ?? PUBLICATION_LICENSES[0]);
  let category = $state(publication?.category ?? MARKETPLACE_CATEGORIES[0]);
  let autoPublish = $state(publication?.autoPublish ?? false);

  const chosen = $derived(fragment.versions.find(entry => entry.number === version));
  const checks = $derived(chosen ? publicationChecks(chosen, scope) : []);

  return {
    /** The versions not public yet: the latest first. */
    get choices() {
      return fragment.versions
        .map(entry => entry.number)
        .filter(number => !publication?.versions.includes(number))
        .reverse();
    },
    get name() {
      return publication?.name ?? publicName(scope, fragment.name);
    },
    get version() {
      return version;
    },
    set version(next: number) {
      version = next;
    },
    get license() {
      return license;
    },
    set license(next: string) {
      license = next;
    },
    get category() {
      return category;
    },
    set category(next: string) {
      category = next;
    },
    get autoPublish() {
      return autoPublish;
    },
    set autoPublish(next: boolean) {
      autoPublish = next;
    },
    get checks() {
      return checks;
    },
    /** The secret parameters: they stay to fill by whoever adds the fragment. */
    get secrets() {
      return (chosen?.parameters ?? []).filter(entry => entry.kind === 'secret').map(entry => entry.key);
    },
    get ready() {
      return !!chosen && canGoPublic(checks);
    },

    /** The person who publishes comes from the page. */
    input(): Omit<PublishToMarketplaceInput, 'author'> {
      return {
        id: fragment.id,
        scope,
        version,
        license,
        category,
        tags: fragment.tags,
        autoPublish,
      };
    },
  };
};

export type PublishForm = ReturnType<typeof createPublishForm>;
