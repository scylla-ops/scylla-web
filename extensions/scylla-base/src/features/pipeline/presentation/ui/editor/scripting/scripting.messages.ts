import { msg } from '@lingui/core/macro';

export const scriptingMessages = {
  scriptView: msg`Script view`,
  byJob: msg`By job`,
  fullDocument: msg`Full document`,

  jobs: msg`Jobs`,
  newJob: msg`New job`,
  noJob: msg`This pipeline has no job yet.`,
  jobIssue: msg`This job cannot run as it is.`,
  /** Beside the id of a command job, as the shell beside a script job. */
  commandShort: msg({ context: 'job-kind', message: 'cmd' }),
  stage: (number: number) => msg`Stage ${number}`,
  waitsFor: msg`Waits for`,
  jobActions: (id: string) => msg`Actions of ${id}`,
  openToSide: msg`Open to the side`,
  deleteJob: msg`Delete the job`,
  dropHint: msg`Drop on a job to wait for it. Hold Alt to keep the other dependencies.`,
  dependenciesDropped: (id: string, deps: string) => msg`${id} no longer waits for ${deps}.`,
  jobMoved: (id: string, target: string) =>
    msg`${id} now runs after ${target}. The jobs that waited for it wait for what it waited for.`,
  undo: msg`Undo`,

  openJobs: msg`Open jobs`,
  closeTab: (id: string) => msg`Close ${id}`,
  splitEditor: msg`Split the editor`,
  closePane: msg`Close the pane`,
  toggleJobList: msg`Show or hide the jobs`,
  toggleJobProperties: msg`Show or hide the job properties`,
  noJobOpen: msg`Open a job from the list.`,
  copyJob: msg`Copy the job`,
  commandPreview: msg`The line that runs`,
  copyAll: msg`Copy all`,
  copied: msg`Copied to the clipboard.`,
  copyFailed: msg`The browser did not let the page write to the clipboard.`,

  jobProperties: msg`Job properties`,
  dependencies: msg`Dependencies`,
  addDependency: msg`Add a dependency`,
  removeDependency: (id: string) => msg`Remove the dependency on ${id}`,
  requiredBy: msg`Required by`,
};
