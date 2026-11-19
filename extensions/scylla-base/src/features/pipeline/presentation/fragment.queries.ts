import { i18n } from '@lingui/core';
import { getModuleDomain, getQueryClient, mutationOptions, queryOptions } from '@scylla/core-sdk';
import { toast } from '@scylla/ui/utils';
import type {
  CreateFragmentInput,
  FragmentEntity,
  FragmentLink,
  LinkingPipeline,
  PublishFragmentVersionInput,
} from '../domain/entities/fragment.entity.ts';
import type { PipelineModule } from '../pipeline.module.ts';
import { libraryMessages } from './messages/library.messages.ts';
import {
  FRAGMENTS_QUERY_KEY,
  FRAGMENTS_QUERY_ROOT,
  FRAGMENT_LINKS_QUERY_KEY,
  FRAGMENT_QUERY_KEY,
} from './pipeline.query-keys.ts';

// Resolved per call: tests swap the registry.
const repository = () =>
  getModuleDomain<typeof PipelineModule.domain>('pipeline').fragmentRepository;

/** Read by the library pages and the editor, behind their own route guards. */
export const fragmentQueries = {
  list: (workspaceId: string | null) =>
    queryOptions<FragmentEntity[]>({
      queryKey: FRAGMENTS_QUERY_KEY(workspaceId ?? ''),
      enabled: !!workspaceId,
      queryFn: () => repository().list(workspaceId!),
      staleTime: 30_000,
    }),

  byId: (workspaceId: string | null, fragmentId: string) =>
    queryOptions<FragmentEntity>({
      queryKey: FRAGMENT_QUERY_KEY(workspaceId ?? '', fragmentId),
      enabled: !!workspaceId && !!fragmentId,
      queryFn: () => repository().getById(workspaceId!, fragmentId),
      staleTime: 30_000,
    }),

  /** Read with the document of the editor: a refetch would replace the links of a draft. */
  links: (pipelineId: string) =>
    queryOptions<FragmentLink[]>({
      queryKey: FRAGMENT_LINKS_QUERY_KEY(pipelineId),
      enabled: !!pipelineId,
      queryFn: () => repository().linksOf(pipelineId),
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }),
};

const refreshLibrary = (workspaceId: string) =>
  void getQueryClient().invalidateQueries({ queryKey: FRAGMENTS_QUERY_KEY(workspaceId) });

export const fragmentMutations = {
  create: () =>
    mutationOptions({
      mutationFn: (input: CreateFragmentInput) => repository().create(input),
      onSuccess: (fragment: FragmentEntity) => {
        refreshLibrary(fragment.workspaceId);
        toast.success(i18n._(libraryMessages.savedTitle), {
          description: i18n._(libraryMessages.savedDetail(fragment.name, 1)),
        });
      },
    }),

  publishVersion: () =>
    mutationOptions({
      mutationFn: (input: PublishFragmentVersionInput) => repository().publishVersion(input),
      onSuccess: (fragment: FragmentEntity) => {
        refreshLibrary(fragment.workspaceId);
        toast.success(i18n._(libraryMessages.publishedTitle), {
          description: i18n._(libraryMessages.savedDetail(fragment.name, fragment.versions.length)),
        });
      },
    }),

  setFavorite: (workspaceId: string) =>
    mutationOptions({
      mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) =>
        repository().setFavorite(id, favorite),
      onSuccess: () => refreshLibrary(workspaceId),
    }),
};

/** For `pipelineMutations.update`: the links go with the nodes, in the same save. */
export const saveFragmentLinks = async (
  pipeline: LinkingPipeline,
  links: FragmentLink[],
): Promise<void> => {
  await repository().saveLinks(pipeline, links);
  const queryClient = getQueryClient();
  void queryClient.invalidateQueries({ queryKey: FRAGMENT_LINKS_QUERY_KEY(pipeline.pipelineId) });
  // The library counts the pipelines that use each fragment.
  void queryClient.invalidateQueries({ queryKey: FRAGMENTS_QUERY_ROOT });
};
