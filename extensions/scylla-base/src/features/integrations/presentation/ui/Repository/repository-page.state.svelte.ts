import { can, Permission } from '@platform/authz';
import { contextStore } from '@platform/context';
import { createMutation, createQuery } from '@scylla/core-sdk';
import { toRune } from '@scylla/ui/stores';
import { t } from '@scylla/ui/i18n';
import { toast } from '@scylla/ui/utils';
import type { MergeBlock } from '@base/features/integrations/domain/entities/merge-block.entity.ts';
import {
  mergeBlockMutations,
  mergeBlockQueries,
} from '@base/features/integrations/presentation/merge-block.queries.ts';
import { repositoryMessages as messages } from '@base/features/integrations/presentation/messages/repository.messages.ts';
import {
  deliveryErrorText,
  deliveryResult,
  reportContexts,
  unlinkStops,
  type DeliveryResult,
} from '@base/features/integrations/presentation/presenters/repository-link.presenter.ts';
import {
  repositoryLinkMutations,
  repositoryLinkQueries,
} from '@base/features/integrations/presentation/repository-link.queries.ts';
import { vcsConnectionQueries } from '@base/features/integrations/presentation/vcs-connection.queries.ts';
import { createPipelineSource } from './pipeline-source.state.svelte.ts';

export type RepositoryDialog = 'link' | 'unlink' | null;

/** The ViewModel of the repository page of a project. Construct it during component initialisation. */
export const createRepositoryPage = (projectId: () => string) => {
  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id ?? '');
  const workspaceSlug = $derived(context().workspace.slug ?? '');
  const projectName = $derived(
    context().project.id === projectId() ? (context().project.name ?? '') : '',
  );
  const canManage = $derived(can(Permission.MANAGE_REPOSITORY_LINK, { projectId: projectId() }));
  const canViewIntegrations = $derived(can(Permission.VIEW_INTEGRATIONS, { workspaceId }));

  const linkQuery = createQuery(() => repositoryLinkQueries.byProject(projectId()));
  const link = $derived(linkQuery.data ?? null);
  const blocksQuery = createQuery(() => mergeBlockQueries.byProject(projectId(), !!link));
  const blocks = $derived(blocksQuery.data ?? []);
  // Only for the address of the installation, when the connection cannot see the repository.
  const connectionsQuery = createQuery(() =>
    vcsConnectionQueries.byWorkspace(
      workspaceId,
      link?.stateReason === 'REPOSITORY_NOT_VISIBLE' && (canManage || canViewIntegrations),
    ),
  );

  const update = createMutation(() => repositoryLinkMutations.update());
  const remove = createMutation(() => repositoryLinkMutations.unlink());
  const test = createMutation(() => repositoryLinkMutations.testDelivery());
  const blockChange = createMutation(() => mergeBlockMutations.set());
  const source = createPipelineSource(projectId, () => link);

  let dialog = $state<RepositoryDialog>(null);

  // While a change is sent, the controls show it; a refusal puts the value of the server back.
  const sending = $derived(update.isPending ? update.variables : undefined);

  return {
    get projectName() {
      return projectName;
    },
    get workspaceId() {
      return workspaceId;
    },
    get workspaceSlug() {
      return workspaceSlug;
    },
    get canManage() {
      return canManage;
    },
    get canViewIntegrations() {
      return canViewIntegrations;
    },
    linkQuery,
    get link() {
      return link;
    },
    /** The page of the installation on GitHub, when the reader can see the connection. */
    get installationUrl() {
      if (!link) return '';
      return connectionsQuery.data?.find(item => item.id === link.connectionId)?.settingsUrl ?? '';
    },

    get reportsEnabled() {
      return sending?.reportsEnabled ?? link?.reportsEnabled ?? false;
    },
    get updating() {
      return update.isPending;
    },
    setReportsEnabled: (reportsEnabled: boolean) =>
      update.mutate({ projectId: projectId(), reportsEnabled }),
    /** `null` until the merge rules come: the names of the reports are the names of the rules. */
    get contexts(): string[] | null {
      return blocksQuery.data ? reportContexts(blocksQuery.data) : null;
    },

    blocksQuery,
    get blocks() {
      return blocks;
    },
    /** One change of a merge rule at a time: the server applies them in turn. */
    get settingBlock() {
      return blockChange.isPending;
    },
    /** The value that a rule goes to while its change is sent, else `undefined`. */
    sendingFor: (block: MergeBlock): boolean | undefined =>
      blockChange.isPending && blockChange.variables.pipelineId === block.pipelineId
        ? blockChange.variables.enabled
        : undefined,
    setBlock: (block: MergeBlock, enabled: boolean) =>
      blockChange.mutate({
        projectId: projectId(),
        ...(block.pipelineId ? { pipelineId: block.pipelineId } : {}),
        enabled,
      }),

    source,

    get testing() {
      return test.isPending;
    },
    get testResult(): DeliveryResult | null {
      if (test.isPending) return null;
      if (test.isError) return { delivered: false, text: deliveryErrorText(test.error) };
      return test.data ? deliveryResult(test.data) : null;
    },
    testDelivery: () => test.mutate(projectId()),

    get dialog() {
      return dialog;
    },
    open: (next: Exclude<RepositoryDialog, null>) => (dialog = next),
    close: () => (dialog = null),

    get stops() {
      return link ? unlinkStops(link, blocks) : [];
    },
    get unlinking() {
      return remove.isPending;
    },
    unlink: () => {
      const name = link?.fullName ?? '';
      remove.mutate(projectId(), {
        onSuccess: () => {
          toast.success(t(messages.unlinked(name)));
          test.reset();
          dialog = null;
        },
      });
    },
  };
};

export type RepositoryPage = ReturnType<typeof createRepositoryPage>;
