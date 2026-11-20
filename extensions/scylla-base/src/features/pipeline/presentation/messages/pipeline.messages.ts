import { msg, plural } from '@lingui/core/macro';

export const pipelineMessages = {
  loadError: msg`Unable to load pipelines`,
  noPipelines: msg`No pipeline found`,
  noPipelinesBody: msg`Create your first pipeline to get started`,

  pipeline: msg`Pipeline`,
  pipelines: msg`Pipelines`,
  newPipeline: msg`New pipeline`,
  createDenied: msg`You don't have permission to create pipelines.`,
  deleteDenied: msg`You don't have permission to delete pipelines.`,
  members: msg`Members`,
  secrets: msg`Secrets`,

  status: msg`Status`,
  history: msg`History`,
  actions: msg`Actions`,

  run: msg`Run`,
  edit: msg`Edit`,
  editPipeline: msg`Edit pipeline`,
  duplicate: msg`Duplicate`,
  viewJobs: msg`View Jobs`,
  triggers: msg`Triggers`,
  pipelineActions: msg`Pipeline actions`,

  jobsForbidden: msg`You don't have permission to view this pipeline's jobs`,
  jobsError: msg`Error loading jobs`,
  noRunYet: msg`No run yet`,
  lastRunAt: (when: string) => msg`Last run ${when}`,
  historyOfLast: (count: number) =>
    msg`History · last ${plural(count, { one: '# run', other: '# runs' })}`,
  runsInTotal: (count: number) =>
    msg`${plural(count, { one: '# run in total', other: '# runs in total' })}`,
  passed: msg`passed`,
  median: msg`median`,
  failed: msg`failed`,
  lastFailure: msg`Last failure`,
  created: msg`Created`,

  selectProjectFirst: msg`Select a project first`,
  create: msg`Create`,
  save: msg`Save`,
  invalidJson: msg`Invalid JSON`,
  scripting: msg`Scripting`,
  blueprint: msg`Blueprint`,
  statusDraft: msg`Draft: not created yet`,
  statusSaving: msg`Saving…`,
  statusDirty: msg`Unsaved changes`,
  statusSaved: msg`All changes saved`,
  editDenied: msg`You don't have permission to edit this pipeline.`,

  deleteEdge: msg`Delete edge`,
  unnamedPipeline: msg`Unnamed`,

  pipelineName: msg`Pipeline name`,
  namePlaceholder: msg`e.g., my-pipeline`,
  noSpaces: msg`The name cannot contain spaces.`,
  nameRequired: msg`The pipeline needs a name.`,
  invalidNodeIds: (ids: string) => msg`Fix the ID of these nodes before you save: ${ids}`,
  repeatedNodeIds: (ids: string) =>
    msg`Two nodes or more have the ID ${ids}. Give each node its own ID before you save.`,
  repeatedNodeId: msg`Same ID as another node`,
  repeatedHint: msg`Two nodes or more have the same ID. Give each node its own ID in the Scripting tab: the blueprint shows them, but cannot change them.`,

  /** A pipeline name is one word: the copy keeps it one word. */
  copyOf: (name: string) => msg`${name}-copy`,
};
