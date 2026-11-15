import { can, Permission } from '@platform/authz';
import { scyllaNavigate } from '@platform/context';
import { createMutation, createQuery } from '@scylla/core-sdk';
import { projectMutations } from '@base/features/project';
import type { PipelineSource } from '@base/features/integrations/domain/entities/repository-link.entity.ts';
import type { ProviderRepository } from '@base/features/integrations/domain/entities/vcs-connection.entity.ts';
import { unavailableText } from '@base/features/integrations/presentation/presenters/connection.presenter.ts';
import {
  linkErrorText,
  repositoryName,
} from '@base/features/integrations/presentation/presenters/repository-link.presenter.ts';
import { pipelineSourceMutations } from '@base/features/integrations/presentation/pipeline-source.queries.ts';
import { repositoryLinkMutations } from '@base/features/integrations/presentation/repository-link.queries.ts';
import { vcsConnectionQueries } from '@base/features/integrations/presentation/vcs-connection.queries.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { createRepositoryPicker } from '../repository-picker.state.svelte.ts';

export interface NewGitHubProjectParams {
  workspaceId: () => string;
  /** The connection to show first: the one that the GitHub callback made. */
  connectionId: string;
}

/** The repository of step 2, as step 1 picked it. */
interface Picked {
  connectionId: string;
  connectionLabel: string;
  repository: ProviderRepository;
  details: string;
}

/**
 * The page of a new project linked to a GitHub repository: step 1 picks the repository, step 2
 * names the project and sets its source and its reports. The project stays when a later call
 * fails: a retry does only the calls that did not pass. Construct it during component
 * initialisation.
 */
export const createNewGitHubProject = (params: NewGitHubProjectParams) => {
  const createProject = createMutation(() => projectMutations.create());
  const link = createMutation(() => repositoryLinkMutations.link());
  const setSource = createMutation(() => pipelineSourceMutations.set());
  const updateLink = createMutation(() => repositoryLinkMutations.update());
  const providersQuery = createQuery(() => vcsConnectionQueries.providers(params.workspaceId()));

  const picker = createRepositoryPicker({
    workspaceId: params.workspaceId,
    provider: 'github',
    connectionId: params.connectionId,
  });

  let step = $state<1 | 2>(1);
  let picked = $state<Picked | null>(null);
  let name = $state('');
  let prefilled = '';
  let description = $state('');
  let source = $state<PipelineSource>('editor');
  let reports = $state(true);

  let projectId = $state('');
  let linked = $state(false);
  let sourceSet = false;
  let reportsSet = false;
  let working = $state(false);
  let failure = $state<string | null>(null);

  const github = $derived(
    providersQuery.data?.find(info => info.provider === 'github'),
  );

  /** Runs one call; a refusal becomes the text under the form. */
  const attempt = async (call: () => Promise<unknown>, text: (error: unknown) => string) => {
    try {
      await call();
      return true;
    } catch (error) {
      failure = text(error);
      return false;
    }
  };
  const userText = (error: unknown) => ScyllaError.from(error).userMessage();

  /** True when the project exists with its link, its source and its reports. */
  const run = async (chosen: Picked): Promise<boolean> => {
    if (!projectId) {
      try {
        const project = await createProject.mutateAsync({
          name: name.trim(),
          workspaceId: params.workspaceId(),
          description: description.trim() || undefined,
        });
        projectId = project.id;
      } catch {
        // The toast of the app shows the refusal of the creation.
        return false;
      }
    }
    const id = projectId;
    if (!linked) {
      const input = {
        projectId: id,
        connectionId: chosen.connectionId,
        externalId: chosen.repository.externalId,
      };
      if (!(await attempt(() => link.mutateAsync(input), linkErrorText))) return false;
      linked = true;
    }
    if (source === 'file' && !sourceSet) {
      const input = { projectId: id, source: 'file' as const };
      if (!(await attempt(() => setSource.mutateAsync(input), userText))) return false;
      sourceSet = true;
    }
    if (!reports && !reportsSet) {
      const input = { projectId: id, reportsEnabled: false };
      if (!(await attempt(() => updateLink.mutateAsync(input), userText))) return false;
      reportsSet = true;
    }
    return true;
  };

  return {
    picker,
    get step() {
      return step;
    },
    get canLink() {
      return can(Permission.MANAGE_REPOSITORY_LINK, { workspaceId: params.workspaceId() });
    },
    get canConnect() {
      return can(Permission.MANAGE_VCS_CONNECTIONS, { workspaceId: params.workspaceId() });
    },
    /** Why this server cannot connect GitHub, or `null`. */
    get githubUnavailable() {
      return unavailableText(github);
    },

    get canContinue() {
      return !!picker.connection && !!picker.selected;
    },
    continue: () => {
      const { connection, selected } = picker;
      if (!connection || !selected) return;
      picked = {
        connectionId: connection.id,
        connectionLabel: picker.connectionLabel,
        repository: selected.repository,
        details: selected.details,
      };
      // A name that the person typed stays; the name of the last repository does not.
      if (!projectId && (!name.trim() || name === prefilled)) {
        prefilled = repositoryName(selected.repository.fullName);
        name = prefilled;
      }
      step = 2;
    },
    /** Back to step 1. A linked repository cannot change: the link is made. */
    get canChange() {
      return !linked && !working;
    },
    change: () => {
      if (linked || working) return;
      failure = null;
      step = 1;
    },

    get picked() {
      return picked;
    },
    get name() {
      return name;
    },
    set name(value: string) {
      name = value;
    },
    get description() {
      return description;
    },
    set description(value: string) {
      description = value;
    },
    get source() {
      return source;
    },
    set source(value: PipelineSource) {
      source = value;
    },
    get reports() {
      return reports;
    },
    set reports(value: boolean) {
      reports = value;
    },
    /** The project exists: its name and its description do not change here. */
    get created() {
      return !!projectId;
    },
    get projectId() {
      return projectId;
    },

    get working() {
      return working;
    },
    get canSubmit() {
      return !!picked && !!name.trim() && !!params.workspaceId() && !working;
    },
    get failure() {
      return failure;
    },
    submit: async () => {
      const chosen = picked;
      if (!chosen || !name.trim() || working) return;
      working = true;
      failure = null;
      const done = await run(chosen);
      working = false;
      if (done) scyllaNavigate.goToProject(projectId, name.trim());
    },
  };
};

export type NewGitHubProject = ReturnType<typeof createNewGitHubProject>;
