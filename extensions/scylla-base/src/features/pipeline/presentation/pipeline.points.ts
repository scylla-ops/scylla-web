import { point } from '@scylla/core-sdk';

/** The saved pipeline that a part of its start node shows. */
export interface PipelineStartContext {
  pipelineId: string;
}

/** What the panel of the start node receives. */
export interface PipelineStartPanelContext extends PipelineStartContext {
  projectId: string;
}

/**
 * Listed in `PipelineModule.points`: the loader names them `pipeline.<key>`. The start node is the
 * pipeline itself. What starts a pipeline is in `features/triggers`, which imports this module:
 * these zones let it show on the start node with no import back.
 */
export const pipelinePoints = {
  /** In the start node of a saved pipeline, after its name: a short fact, such as a count. */
  startBadge: point.zone<PipelineStartContext>(),
  /**
   * The body of the panel that a click on the start node of a saved pipeline opens, below its
   * title. Its own content says that the reader cannot see what is there.
   */
  startPanel: point.zone<PipelineStartPanelContext>(),
};
