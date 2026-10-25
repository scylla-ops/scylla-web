import { msg } from '@lingui/core/macro';

export const scriptingMessages = {
  scriptView: msg`Script view`,
  byStep: msg`By step`,
  fullDocument: msg`Full document`,

  steps: msg`Steps`,
  newStep: msg`New step`,
  noStep: msg`This pipeline has no step yet.`,
  stepIssue: msg`This step cannot run as it is.`,
  /** Beside the id of a command step, as the shell beside a script step. */
  commandShort: msg({ context: 'step-kind', message: 'cmd' }),
  stage: (number: number) => msg`Stage ${number}`,
  waitsFor: msg`Waits for`,
  stepActions: (id: string) => msg`Actions of ${id}`,
  openToSide: msg`Open to the side`,
  dropHint: msg`Drop on a step to wait for it. Hold Alt to keep the other dependencies.`,
  dependenciesDropped: (id: string, deps: string) => msg`${id} no longer waits for ${deps}.`,
  stepMoved: (id: string, target: string) =>
    msg`${id} now runs after ${target}. The steps that waited for it wait for what it waited for.`,
  undo: msg`Undo`,

  openSteps: msg`Open steps`,
  closeTab: (id: string) => msg`Close ${id}`,
  splitEditor: msg`Split the editor`,
  closePane: msg`Close the pane`,
  toggleStepList: msg`Show or hide the steps`,
  toggleStepProperties: msg`Show or hide the step properties`,
  noStepOpen: msg`Open a step from the list.`,
  copyStep: msg`Copy the step`,
  commandPreview: msg`The line that runs`,
  copyAll: msg`Copy all`,

  stepProperties: msg`Step properties`,
  dependencies: msg`Dependencies`,
  addDependency: msg`Add a dependency`,
  removeDependency: (id: string) => msg`Remove the dependency on ${id}`,
  requiredBy: msg`Required by`,
};
