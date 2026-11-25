import { Permission } from '@platform/authz';
import { pipelinePoints } from '@base/features/pipeline';

/**
 * The triggers of a pipeline in its graph: their count on the start node, and the panel that a
 * click on the start node opens, in the editor and in the view of a file pipeline. The pipeline
 * opens the zones: this module reads the pipeline, so the pipeline cannot import it.
 */
export const PipelineTriggersWidgetInjection = [
  pipelinePoints.startBadge.inject({
    permission: Permission.MANAGE_TRIGGERS,
    component: () =>
      import('@base/features/triggers/presentation/ui/pipeline-panel/TriggerCountChip/TriggerCountChip.svelte'),
  }),
  pipelinePoints.startPanel.inject({
    position: 'replace',
    permission: Permission.MANAGE_TRIGGERS,
    component: () =>
      import('@base/features/triggers/presentation/ui/pipeline-panel/PipelineTriggersPanel/PipelineTriggersPanel.svelte'),
  }),
];
