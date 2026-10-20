import { msg } from '@lingui/core/macro';

export const scriptingMessages = {
  scriptView: msg`Script view`,
  byJob: msg`By job`,
  fullDocument: msg`Full document`,

  jobs: msg`Jobs`,
  newJob: msg`New job`,
  noJob: msg`This pipeline has no job yet.`,
  jobIssue: msg`This job cannot run as it is.`,
  jobActions: (id: string) => msg`Actions of ${id}`,
  openToSide: msg`Open to the side`,
  deleteJob: msg`Delete the job`,

  openJobs: msg`Open jobs`,
  closeTab: (id: string) => msg`Close ${id}`,
  splitEditor: msg`Split the editor`,
  closePane: msg`Close the pane`,
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
