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
  invalidJson: (error: string) => msg`Invalid JSON: ${error}`,
  scripting: msg`Scripting`,
  blueprint: msg`Blueprint`,
  statusDraft: msg`Draft: not created yet`,
  statusSaving: msg`Saving…`,
  statusError: msg`Save failed`,
  statusDirty: msg`Unsaved changes`,
  statusSaved: msg`All changes saved`,
  leaveTitle: msg`Leave without saving?`,
  leaveBody: msg`Your changes to this pipeline are not saved. If you leave now, you lose them.`,
  leaveStay: msg`Stay`,
  leaveAnyway: msg`Leave without saving`,
  editDenied: msg`You don't have permission to edit this pipeline.`,
  agentLabels: msg`Agent labels`,
  agentLabelsHint: msg`Only an agent with each of these labels runs the jobs of this pipeline. With no label, any agent of the project runs them.`,
  agentLabelsCount: (count: number) =>
    msg`${plural(count, { one: '# agent label', other: '# agent labels' })}`,
  saveLabels: msg`Save labels`,
  agentLabelsSaved: msg`Agent labels saved`,
  agentLabelsWithCreate: msg`Create saves these labels with the pipeline.`,
  gitEventsAllowed: msg`Git events allowed`,
  gitEventsStopped: msg`Git events stopped`,

  deleteEdge: msg`Delete edge`,
  unnamedPipeline: msg`Unnamed`,

  pipelineName: msg`Pipeline name`,
  namePlaceholder: msg`e.g., my-pipeline`,
  nameTooLong: (max: number) => msg`The name cannot be longer than ${max} characters.`,
  nameOneLine: msg`The name must be on one line.`,
  nameRequired: msg`The pipeline needs a name.`,
  keyTaken: (path: string, key: string) =>
    msg`The file ${path} already uses the key ${key}. Choose another name.`,
  invalidNodeIds: (ids: string) => msg`Fix the ID of these nodes before you save: ${ids}`,
  repeatedNodeIds: (ids: string) =>
    msg`Two nodes or more have the ID ${ids}. Give each node its own ID before you save.`,
  repeatedNodeId: msg`Same ID as another node`,
  invalidNodes: (ids: string) => msg`Fix these nodes before you save: ${ids}`,
  repeatedHint: msg`Two nodes or more have the same ID. Give each node its own ID in the Scripting tab: the blueprint shows them, but cannot change them.`,

  /** A pipeline name is one word: the copy keeps it one word. */
  copyOf: (name: string) => msg`${name}-copy`,
};
