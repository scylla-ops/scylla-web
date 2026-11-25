import { can, Permission } from '@platform/authz';
import { createMutation, createQuery } from '@scylla/core-sdk';
import { repositoryLinkQueries } from '@base/features/integrations';
import {
  gitEventsMutations,
  pipelineQueries,
} from '@base/features/pipeline/presentation/pipeline.queries.ts';
import { gitEventsState } from '@base/features/pipeline/presentation/presenters/git-events.presenter.ts';

interface GitEventsOptions {
  projectId: () => string;
  pipelineId: () => string;
}

/**
 * The Git events of a pipeline, and their opt-in: in a project of files, the push, pull request
 * and tag triggers of a Scylla pipeline start runs only after a workspace admin allows them. A
 * change asks first (`GitEventsDialog`). The link and the pipeline are the cache entries of the
 * pages that show them: no new request.
 */
export const createGitEvents = (options: GitEventsOptions) => {
  const linkQuery = createQuery(() => repositoryLinkQueries.byProject(options.projectId()));
  const pipelineQuery = createQuery(() => ({
    ...pipelineQueries.byId(options.pipelineId()),
    enabled: !!options.pipelineId() && can(Permission.READ_PIPELINE),
  }));
  const set = createMutation(() => gitEventsMutations.set(options.pipelineId()));
  // The change stays while the dialog closes: its text does not change during the animation.
  let change = $state<'allow' | 'revoke'>('allow');
  let asking = $state(false);

  const state = $derived(
    gitEventsState(pipelineQuery.data?.origin, linkQuery.data?.pipelineSource),
  );

  return {
    /** The project takes its pipelines from the files, and this pipeline comes from the editor. */
    get needed() {
      return state.needed;
    },
    /** The Git events start runs: an admin allowed them, or the project needs no opt-in. */
    get allowed() {
      return state.allowed;
    },
    get canManage() {
      return can(Permission.SET_PIPELINE_GIT_EVENTS);
    },
    /** The dialog asks for `change`. */
    get asking() {
      return asking;
    },
    get change() {
      return change;
    },
    get isPending() {
      return set.isPending;
    },
    ask(next: 'allow' | 'revoke') {
      change = next;
      asking = true;
    },
    cancel() {
      if (!set.isPending) asking = false;
    },
    confirm() {
      set.mutate(change === 'allow', { onSuccess: () => (asking = false) });
    },
  };
};

export type GitEvents = ReturnType<typeof createGitEvents>;
