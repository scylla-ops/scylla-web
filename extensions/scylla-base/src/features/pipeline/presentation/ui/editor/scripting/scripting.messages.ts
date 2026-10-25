import { msg } from '@lingui/core/macro';

export const scriptingMessages = {
  scriptView: msg`Script view`,
  byJob: msg`By step`,
  fullDocument: msg`Full document`,

  jobs: msg`Steps`,
  newJob: msg`New step`,
  noJob: msg`This pipeline has no step yet.`,
  jobIssue: msg`This step cannot run as it is.`,
  /** Beside the id of a command step, as the shell beside a script step. */
  commandShort: msg({ context: 'job-kind', message: 'cmd' }),
  stage: (number: number) => msg`Stage ${number}`,
  waitsFor: msg`Waits for`,
  jobActions: (id: string) => msg`Actions of ${id}`,
  openToSide: msg`Open to the side`,
  deleteJob: msg`Delete the step`,
  dropHint: msg`Drop on a step to wait for it. Hold Alt to keep the other dependencies.`,
  dependenciesDropped: (id: string, deps: string) => msg`${id} no longer waits for ${deps}.`,
  jobMoved: (id: string, target: string) =>
    msg`${id} now runs after ${target}. The steps that waited for it wait for what it waited for.`,
  undo: msg`Undo`,

  openJobs: msg`Open steps`,
  closeTab: (id: string) => msg`Close ${id}`,
  splitEditor: msg`Split the editor`,
  closePane: msg`Close the pane`,
  toggleJobList: msg`Show or hide the steps`,
  toggleJobProperties: msg`Show or hide the step properties`,
  noJobOpen: msg`Open a step from the list.`,
  copyJob: msg`Copy the step`,
  commandPreview: msg`The line that runs`,
  copyAll: msg`Copy all`,
  copied: msg`Copied to the clipboard.`,
  copyFailed: msg`The browser did not let the page write to the clipboard.`,

  jobProperties: msg`Step properties`,
  dependencies: msg`Dependencies`,
  addDependency: msg`Add a dependency`,
  removeDependency: (id: string) => msg`Remove the dependency on ${id}`,
  requiredBy: msg`Required by`,
};
