import { i18n } from '@lingui/core';
import { getQueryClient, mutationOptions, queryOptions, getModuleDomain } from '@scylla/core-sdk';
import { toast } from '@scylla/ui/utils';
import { ToastMessages } from '@shared/utils/toast-messages.ts';
import type {
  TriggerDraft,
  TriggerEntity,
  WorkspaceTrigger,
} from '../domain/entities/trigger.entity.ts';
import type { TriggersModule } from '../triggers.module.ts';

// Resolved per call: tests swap the registry.
const repository = () =>
  getModuleDomain<typeof TriggersModule.domain>('triggers').triggersRepository;

export const CREATE_TRIGGER_MUTATION_KEY = ['trigger', 'create'] as const;

export const TRIGGERS_QUERY_KEY = (pipelineId: string) =>
  ['triggers', 'pipeline', pipelineId] as const;

/** Under the `'triggers'` root: a change of a trigger refreshes the results of a search. */
const SEARCH_TRIGGERS_QUERY_KEY = (workspaceId: string | null, text: string, limit: number) =>
  ['triggers', 'workspace', workspaceId, 'search', text, limit] as const;

/** Must match `JOBS_QUERY_KEY` of `jobs`: not imported, to keep the graph acyclic. */
const JOBS_OF_PIPELINE = (pipelineId: string) => ['jobs', 'pipeline', pipelineId] as const;

export const triggerQueries = {
  /** Polls only while an enabled cron trigger exists: nothing else changes by itself. */
  byPipeline: (pipelineId: string) =>
    queryOptions<TriggerEntity[]>({
      queryKey: TRIGGERS_QUERY_KEY(pipelineId),
      enabled: !!pipelineId,
      queryFn: () => repository().listByPipelineId(pipelineId),
      staleTime: 30 * 1000,
      refetchInterval: query => {
        const triggers = query.state.data ?? [];
        const hasEnabledCron = triggers.some(
          trigger => trigger.enabled && trigger.source.kind === 'cron',
        );
        return hasEnabledCron ? 30_000 : false;
      },
    }),

  /**
   * The triggers of the workspace whose name, pipeline name or project name holds `text`. A new
   * text stops the call of the old one, and the old results stay until the new ones come. The
   * pages of the triggers need MANAGE_TRIGGERS: the caller adds it to `enabled`.
   */
  search: (
    workspaceId: string | null,
    text: string,
    limit: number,
    options: { enabled?: boolean } = {},
  ) =>
    queryOptions<WorkspaceTrigger[]>({
      queryKey: SEARCH_TRIGGERS_QUERY_KEY(workspaceId, text, limit),
      enabled: (options.enabled ?? true) && !!workspaceId,
      queryFn: ({ signal }) =>
        repository().searchWorkspace({ workspaceId: workspaceId!, text, limit }, signal),
      placeholderData: previous => previous,
      staleTime: 10_000,
    }),
};

const invalidateTriggers = (pipelineId: string) =>
  getQueryClient().invalidateQueries({ queryKey: TRIGGERS_QUERY_KEY(pipelineId) });

export const triggerMutations = {
  create: (pipelineId: string) =>
    mutationOptions({
      mutationKey: CREATE_TRIGGER_MUTATION_KEY,
      mutationFn: (draft: TriggerDraft) => repository().create(pipelineId, draft),
      onSuccess: () => {
        toast.success(i18n._(ToastMessages.TRIGGER_CREATE));
        void invalidateTriggers(pipelineId);
      },
    }),

  update: (pipelineId: string) =>
    mutationOptions({
      mutationFn: ({ triggerId, draft }: { triggerId: string; draft: TriggerDraft }) =>
        repository().update(triggerId, draft),
      onSuccess: () => {
        toast.success(i18n._(ToastMessages.TRIGGER_UPDATE));
        void invalidateTriggers(pipelineId);
      },
    }),

  /** A deleted webhook URL is gone forever, unlike disabling. Confirm first. */
  remove: (pipelineId: string) =>
    mutationOptions({
      mutationFn: (triggerId: string) => repository().deleteById(triggerId),
      onSuccess: () => {
        toast.success(i18n._(ToastMessages.TRIGGER_DELETE));
        void invalidateTriggers(pipelineId);
      },
    }),

  /** Optimistic: the switch moves at once, and `onError` rolls it back. */
  setEnabled: (pipelineId: string) =>
    mutationOptions({
      mutationFn: ({ triggerId, enabled }: { triggerId: string; enabled: boolean }) =>
        repository().setEnabled(triggerId, enabled),
      onMutate: async ({ triggerId, enabled }) => {
        const queryClient = getQueryClient();
        const key = TRIGGERS_QUERY_KEY(pipelineId);
        await queryClient.cancelQueries({ queryKey: key });

        const previous = queryClient.getQueryData<TriggerEntity[]>(key);
        queryClient.setQueryData<TriggerEntity[]>(key, current =>
          (current ?? []).map(trigger =>
            trigger.id === triggerId ? { ...trigger, enabled } : trigger,
          ),
        );

        return { previous };
      },
      onError: (_error, _variables, context) => {
        if (context?.previous) {
          getQueryClient().setQueryData(TRIGGERS_QUERY_KEY(pipelineId), context.previous);
        }
      },
      onSuccess: (_data, { enabled }) => {
        toast.success(
          i18n._(enabled ? ToastMessages.TRIGGER_ENABLED : ToastMessages.TRIGGER_DISABLED),
        );
      },
      onSettled: () => void invalidateTriggers(pipelineId),
    }),

  /**
   * The same as `setEnabled`, for a trigger of any pipeline (the command bar): the variables name
   * the pipeline. Each list of triggers reads again.
   */
  setEnabledOf: () =>
    mutationOptions({
      mutationFn: ({
        triggerId,
        enabled,
      }: {
        triggerId: string;
        pipelineId: string;
        enabled: boolean;
      }) => repository().setEnabled(triggerId, enabled),
      onSuccess: (_data, { enabled }) => {
        toast.success(
          i18n._(enabled ? ToastMessages.TRIGGER_ENABLED : ToastMessages.TRIGGER_DISABLED),
        );
      },
      onSettled: () => void getQueryClient().invalidateQueries({ queryKey: ['triggers'] }),
    }),

  /** Creates a real job: the pipeline's job list is invalidated too. */
  fireNow: (pipelineId: string) =>
    mutationOptions({
      mutationFn: (triggerId: string) => repository().fireNow(triggerId),
      onSuccess: () => {
        toast.success(i18n._(ToastMessages.TRIGGER_FIRED));
        void getQueryClient().invalidateQueries({ queryKey: JOBS_OF_PIPELINE(pipelineId) });
        void invalidateTriggers(pipelineId);
      },
    }),
};
