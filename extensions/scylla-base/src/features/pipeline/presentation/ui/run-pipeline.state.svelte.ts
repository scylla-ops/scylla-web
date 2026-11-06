import { i18n, type MessageDescriptor } from '@lingui/core';
import { SvelteSet } from 'svelte/reactivity';
import { Permission, can } from '@platform/authz';
import { scyllaNavigate, contextStore } from '@platform/context';
import { createMutation, createQuery } from '@scylla/core-sdk';
import { appQueries } from '@base/features/apps';
import { toRune } from '@scylla/ui/stores';
import { toast } from '@scylla/ui/utils';
import { ToastMessages } from '@shared/utils/toast-messages.ts';
import type { PipelineRun } from '@base/features/pipeline/domain/entities/pipeline.entity.ts';
import { pipelineMutations } from '../pipeline.queries.ts';

/**
 * Runs a pipeline and warns when no agent is connected (the job would wait).
 * Without `LIST_AGENTS`, connectivity is unknown: the message says to check the agents.
 */
export const createRunPipeline = () => {
  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id ?? '');

  const canListAgents = $derived(can(Permission.LIST_AGENTS, { workspaceId }));
  const agentsQuery = createQuery(() => appQueries.runners(workspaceId));
  const runPipeline = createMutation(() => pipelineMutations.run());

  const inFlight = new SvelteSet<string>();

  const warn = (message: MessageDescriptor) =>
    toast.warning(i18n._(message), {
      action: { label: 'Agents', onClick: () => scyllaNavigate.goToWorkspaceRoute('/agents') },
    });

  const announce = ({ needsContainer }: PipelineRun) => {
    if (!canListAgents) {
      toast.success(i18n._(ToastMessages.PIPELINE_RUN_CHECK_AGENTS));
      return;
    }

    const connected = (agentsQuery.data ?? []).filter(agent => agent.connected);
    if (connected.length === 0) {
      warn(ToastMessages.PIPELINE_JOB_QUEUED_WARNING);
      return;
    }
    if (needsContainer && !connected.some(agent => agent.host?.containerRuntime)) {
      warn(ToastMessages.PIPELINE_NO_CONTAINER_RUNTIME);
      return;
    }

    toast.success(i18n._(ToastMessages.PIPELINE_RUN));
  };

  return {
    isRunning: (pipelineId: string) => inFlight.has(pipelineId),

    async run(pipelineId: string): Promise<void> {
      inFlight.add(pipelineId);
      try {
        announce(await runPipeline.mutateAsync(pipelineId));
      } catch {
        // The global mutation handler toasts the error.
      } finally {
        inFlight.delete(pipelineId);
      }
    },
  };
};

export type RunPipeline = ReturnType<typeof createRunPipeline>;
