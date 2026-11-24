import { msg } from '@lingui/core/macro';
import ListChecksIcon from '@lucide/svelte/icons/list-checks';
import PencilIcon from '@lucide/svelte/icons/pencil';
import WorkflowIcon from '@lucide/svelte/icons/workflow';
import { Permission } from '@platform/authz';
import { contextStore } from '@platform/context';
import { routeParams, type CommandDefinition } from '@scylla/core-sdk';
import { toRune } from '@scylla/ui/stores';

const context = toRune(contextStore);

/** The URL below the open project. `null` when the current URL has no project. */
const inProject = (path: string): string | null => {
  const { workspaceSlug, projectId } = routeParams();
  return workspaceSlug && projectId ? `/${workspaceSlug}/projects/${projectId}/${path}` : null;
};

const openPipeline = () => routeParams().pipelineId;
const pipelineName = () => context().pipeline.name ?? openPipeline();

export const pipelineCommands: readonly CommandDefinition[] = [
  {
    id: 'pipeline.create',
    kind: 'create',
    title: msg`New pipeline`,
    keywords: msg`create add workflow`,
    icon: WorkflowIcon,
    permission: Permission.CREATE_PIPELINE,
    available: () => !!routeParams().projectId,
    here: () => !!routeParams().projectId && !openPipeline(),
    place: () => context().project.name ?? undefined,
    form: { path: () => inProject('create') },
  },
  {
    id: 'pipeline.jobs',
    kind: 'go',
    title: msg`Jobs of this pipeline`,
    keywords: msg`runs history logs`,
    icon: ListChecksIcon,
    permission: Permission.LIST_JOBS_BY_PIPELINE,
    here: () => !!openPipeline(),
    place: pipelineName,
    path: () => (openPipeline() ? inProject(`pipelines/${openPipeline()}/jobs`) : null),
  },
  {
    id: 'pipeline.edit',
    kind: 'go',
    title: msg`Edit this pipeline`,
    keywords: msg`editor change nodes`,
    icon: PencilIcon,
    permission: Permission.UPDATE_PIPELINE,
    here: () => !!openPipeline(),
    place: pipelineName,
    path: () => (openPipeline() ? inProject(`edit/${openPipeline()}`) : null),
  },
];
