import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { FragmentRepository } from '@base/features/pipeline/domain/repository/fragment.repository.ts';
import {
  latestVersion,
  type AddCommunityFragmentInput,
  type CreateFragmentInput,
  type FragmentEntity,
  type FragmentLink,
  type FragmentUsage,
  type LinkingPipeline,
  type PublishFragmentVersionInput,
  type PublishToMarketplaceInput,
} from '@base/features/pipeline/domain/entities/fragment.entity.ts';
import {
  acceptUpstream,
  detachAsFork,
  dismissUpstream,
  skipUpstream,
} from '@base/features/pipeline/domain/structs/fragment-upstream.struct.ts';
import {
  publicName,
  withDeprecated,
  withNewVersion,
  withPublication,
} from '@base/features/pipeline/domain/structs/fragment-publication.struct.ts';
import { seedFragments, type StoredFragment } from './fragment-seeds.ts';

const STORAGE_KEY = 'scylla.fragment-library';

interface StoredLinks {
  pipeline: LinkingPipeline;
  links: FragmentLink[];
}

interface StoredLibrary {
  /** The workspaces whose demo fragments are already in `fragments`. */
  seeded: string[];
  fragments: StoredFragment[];
  favorites: string[];
  linksByPipeline: Record<string, StoredLinks>;
}

const EMPTY_LIBRARY: StoredLibrary = {
  seeded: [],
  fragments: [],
  favorites: [],
  linksByPipeline: {},
};

type LibraryStorage = Pick<Storage, 'getItem' | 'setItem'>;

/**
 * TODO: the server has no library yet. This repository keeps it in the browser, with demo
 * fragments in each workspace; a gRPC repository replaces it in `pipeline.module.ts`, and the
 * domain contract and `fragmentQueries` stay the same.
 */
export class DefaultFragmentRepository implements FragmentRepository {
  constructor(private readonly storage: () => LibraryStorage = () => localStorage) {}

  public list(workspaceId: string): Promise<FragmentEntity[]> {
    return this.run(library => {
      const seeded = this.withSeeds(library, workspaceId);
      return {
        next: seeded,
        result: seeded.fragments
          .filter(fragment => fragment.workspaceId === workspaceId)
          .map(fragment => this.toEntity(seeded, fragment)),
      };
    });
  }

  public getById(workspaceId: string, id: string): Promise<FragmentEntity> {
    return this.run(library => {
      const seeded = this.withSeeds(library, workspaceId);
      return { next: seeded, result: this.toEntity(seeded, this.find(seeded, id)) };
    });
  }

  public create(input: CreateFragmentInput): Promise<FragmentEntity> {
    return this.add(input.workspaceId, {
      name: input.name,
      description: input.description,
      tags: input.tags,
      author: input.author,
      versions: [
        {
          number: 1,
          nodes: input.nodes,
          parameters: input.parameters,
          changes: [`First version, saved from ${input.sourcePipeline}.`],
          author: input.author,
          publishedAt: new Date().toISOString(),
        },
      ],
    });
  }

  /**
   * A linked fragment keeps the numbers of the publisher, and gets the newer versions as
   * upstream. A fork starts at its own version 1.
   */
  public addFromMarketplace(input: AddCommunityFragmentInput): Promise<FragmentEntity> {
    const reference = publicName(input.package.publisher, input.package.name);
    const linked = input.mode === 'linked';
    const now = new Date().toISOString();
    return this.add(input.workspaceId, {
      name: input.name,
      description: input.description,
      tags: input.tags,
      author: input.author,
      versions: [
        linked
          ? input.version
          : {
              ...input.version,
              number: 1,
              changes: [`Forked from ${reference} v${input.version.number}.`],
              author: input.author,
              publishedAt: now,
            },
      ],
      source: linked
        ? {
            kind: 'linked',
            package: input.package,
            addedAt: now,
            upstream: input.newer,
            skipped: [],
          }
        : {
            kind: 'forked',
            package: input.package,
            addedAt: now,
            baseVersion: input.version.number,
            upstream: input.newer.at(-1) ?? null,
          },
    });
  }

  public publishVersion(input: PublishFragmentVersionInput): Promise<FragmentEntity> {
    return this.run(library => {
      const fragment = this.find(library, input.id);
      const published: StoredFragment = {
        ...fragment,
        versions: [
          ...fragment.versions,
          {
            number: latestVersion(fragment).number + 1,
            nodes: input.nodes,
            parameters: input.parameters,
            changes: input.changes,
            author: input.author,
            publishedAt: new Date().toISOString(),
          },
        ],
        publication: withNewVersion(fragment.publication, latestVersion(fragment).number + 1),
      };
      const next = {
        ...library,
        fragments: library.fragments.map(stored => (stored.id === input.id ? published : stored)),
      };
      return { next, result: this.toEntity(next, published) };
    });
  }

  public acceptUpstream(id: string, version: number): Promise<FragmentEntity> {
    return this.update(id, fragment => acceptUpstream(fragment, version));
  }

  public skipUpstream(id: string, version: number): Promise<FragmentEntity> {
    return this.update(id, fragment => skipUpstream(fragment, version));
  }

  public dismissUpstream(id: string): Promise<FragmentEntity> {
    return this.update(id, fragment => dismissUpstream(fragment));
  }

  public detachAsFork(id: string): Promise<FragmentEntity> {
    return this.update(id, fragment => detachAsFork(fragment));
  }

  public publishToMarketplace({
    id,
    ...input
  }: PublishToMarketplaceInput): Promise<FragmentEntity> {
    return this.update(id, fragment => ({
      tags: input.tags,
      publication: withPublication(
        fragment.publication,
        fragment.name,
        input,
        new Date().toISOString(),
      ),
    }));
  }

  public deprecateVersion(id: string, version: number): Promise<FragmentEntity> {
    return this.update(id, fragment => {
      if (!fragment.publication) throw new ScyllaError(`${fragment.name} is not public`);
      return { publication: withDeprecated(fragment.publication, version) };
    });
  }

  public setFavorite(id: string, favorite: boolean): Promise<void> {
    return this.run(library => {
      const others = library.favorites.filter(favoriteId => favoriteId !== id);
      return {
        next: { ...library, favorites: favorite ? [...others, id] : others },
        result: undefined,
      };
    });
  }

  public linksOf(pipelineId: string): Promise<FragmentLink[]> {
    return this.read(library => library.linksByPipeline[pipelineId]?.links ?? []);
  }

  public saveLinks(pipeline: LinkingPipeline, links: FragmentLink[]): Promise<void> {
    return this.run(library => {
      const { [pipeline.pipelineId]: _previous, ...others } = library.linksByPipeline;
      const linksByPipeline = links.length
        ? { ...others, [pipeline.pipelineId]: { pipeline, links } }
        : others;
      return { next: { ...library, linksByPipeline }, result: undefined };
    });
  }

  /** Adds a fragment to the library of the workspace, under a name that no other fragment has. */
  private add(
    workspaceId: string,
    fragment: Omit<StoredFragment, 'id' | 'workspaceId' | 'seededUsages'>,
  ): Promise<FragmentEntity> {
    return this.run(stored => {
      // Seeded first: a name of the demo library is taken too.
      const library = this.withSeeds(stored, workspaceId);
      const taken = library.fragments.some(
        other => other.workspaceId === workspaceId && other.name === fragment.name,
      );
      if (taken) {
        throw new ScyllaError(`A fragment is already named ${fragment.name}`, {
          code: 'ALREADY_EXISTS',
        });
      }

      const added: StoredFragment = {
        ...fragment,
        id: crypto.randomUUID(),
        workspaceId,
        seededUsages: [],
      };
      const next = { ...library, fragments: [...library.fragments, added] };
      return { next, result: this.toEntity(next, added) };
    });
  }

  /** Changes one fragment, and gives it back as the library now holds it. */
  private update(
    id: string,
    change: (fragment: StoredFragment) => Partial<StoredFragment>,
  ): Promise<FragmentEntity> {
    return this.run(library => {
      const fragment = this.find(library, id);
      const changed: StoredFragment = { ...fragment, ...change(fragment) };
      const next = {
        ...library,
        fragments: library.fragments.map(stored => (stored.id === id ? changed : stored)),
      };
      return { next, result: this.toEntity(next, changed) };
    });
  }

  private withSeeds(library: StoredLibrary, workspaceId: string): StoredLibrary {
    if (library.seeded.includes(workspaceId)) return library;
    return {
      ...library,
      seeded: [...library.seeded, workspaceId],
      fragments: [...library.fragments, ...seedFragments(workspaceId)],
    };
  }

  private find(library: StoredLibrary, id: string): StoredFragment {
    const fragment = library.fragments.find(stored => stored.id === id);
    if (!fragment) throw new ScyllaError(`No fragment ${id}`, { code: 'NOT_FOUND' });
    return fragment;
  }

  private toEntity(
    library: StoredLibrary,
    { seededUsages, ...fragment }: StoredFragment,
  ): FragmentEntity {
    const linked: FragmentUsage[] = Object.values(library.linksByPipeline).flatMap(
      ({ pipeline, links }) =>
        links
          .filter(link => link.fragmentId === fragment.id)
          .map(link => ({ ...pipeline, version: link.version, values: link.values })),
    );
    return {
      ...fragment,
      favorite: library.favorites.includes(fragment.id),
      usages: [...linked, ...seededUsages],
    };
  }

  private load(): StoredLibrary {
    const raw = this.storage().getItem(STORAGE_KEY);
    if (raw === null) return EMPTY_LIBRARY;
    try {
      return { ...EMPTY_LIBRARY, ...(JSON.parse(raw) as Partial<StoredLibrary>) };
    } catch {
      return EMPTY_LIBRARY;
    }
  }

  private read<T>(query: (library: StoredLibrary) => T): Promise<T> {
    return Promise.resolve().then(() => query(this.load()));
  }

  /** Reads, changes and writes the library in one step. */
  private run<T>(
    change: (library: StoredLibrary) => { next: StoredLibrary; result: T },
  ): Promise<T> {
    return Promise.resolve().then(() => {
      const library = this.load();
      const { next, result } = change(library);
      if (next !== library) this.storage().setItem(STORAGE_KEY, JSON.stringify(next));
      return result;
    });
  }
}
