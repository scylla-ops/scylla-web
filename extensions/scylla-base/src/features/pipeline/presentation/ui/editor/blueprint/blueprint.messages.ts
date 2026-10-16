import { msg, plural } from '@lingui/core/macro';

export const blueprintMessages = {
  addStep: msg`Add a step`,
  blockBash: msg`Script · bash`,
  blockBashHint: msg`Shell lines run with bash`,
  blockSh: msg`Script · sh`,
  blockShHint: msg`Shell lines run with sh`,
  blockCommand: msg`Command`,
  blockCommandHint: msg`One program and its arguments`,
  paletteHint: msg`Drag a block onto the canvas. Drop it on a step to run it after that step.`,
  steps: msg`Steps`,
  noStepsYet: msg`No steps yet.`,
  runsFirst: msg`first`,
  runsAfterList: (deps: string) => msg`after ${deps}`,

  emptyCanvasTitle: msg`Drag a block here`,
  emptyCanvasBody: msg`It becomes the first step. It starts as soon as the pipeline runs.`,
  addBashScript: msg`Add a bash script`,
  canvasHint: msg`Click a step to edit it · Drag from a dot to link two steps`,

  variableCount: (count: number) =>
    msg`${plural(count, { one: '# variable', other: '# variables' })}`,
  emptyScript: msg`Empty script`,
  noProgram: msg`No program`,

  stepId: msg`Step id`,
  deleteStep: msg`Delete step`,
  closePanel: msg`Close panel`,
  stepType: msg`Step type`,
  program: msg`Program`,
  programPlaceholder: msg`e.g., cargo`,
  argument: (position: number) => msg`Argument ${position}`,
  runsAfter: msg`Runs after`,
  runsFirstHint: msg`Runs first, as soon as the pipeline starts.`,
  addDependency: msg`Add a dependency`,
  removeDependency: (id: string) => msg`Remove the dependency on ${id}`,
  draftNote: msg`Changes go to the draft. Save the pipeline to keep them.`,
  nameHint: msg`No spaces: the name is part of URLs.`,
};
