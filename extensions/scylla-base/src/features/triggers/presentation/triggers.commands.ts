import { msg } from '@lingui/core/macro';
import PlusIcon from '@lucide/svelte/icons/plus';
import ZapIcon from '@lucide/svelte/icons/zap';
import { Permission } from '@platform/authz';
import { contextStore } from '@platform/context';
import { routeParams, type CommandDefinition } from '@scylla/core-sdk';
import { toRune } from '@scylla/ui/stores';

const context = toRune(contextStore);

const triggersPath = (suffix = ''): string | null => {
  const { workspaceSlug, projectId, pipelineId } = routeParams();
  return workspaceSlug && projectId && pipelineId
    ? `/${workspaceSlug}/projects/${projectId}/pipelines/${pipelineId}/triggers${suffix}`
    : null;
};

const pipelineName = () => context().pipeline.name ?? routeParams().pipelineId;

export const triggersCommands: readonly CommandDefinition[] = [
  {
    id: 'triggers.list',
    kind: 'go',
    title: msg`Triggers of this pipeline`,
    keywords: msg`webhook schedule cron`,
    icon: ZapIcon,
    permission: Permission.MANAGE_TRIGGERS,
    here: () => !!routeParams().pipelineId,
    place: pipelineName,
    path: () => triggersPath(),
  },
  {
    id: 'triggers.create',
    kind: 'create',
    title: msg`New trigger`,
    keywords: msg`create add webhook schedule cron`,
    icon: PlusIcon,
    permission: Permission.MANAGE_TRIGGERS,
    available: () => !!routeParams().pipelineId,
    here: () => !!routeParams().pipelineId,
    place: pipelineName,
    form: { path: () => triggersPath('/new') },
  },
];
