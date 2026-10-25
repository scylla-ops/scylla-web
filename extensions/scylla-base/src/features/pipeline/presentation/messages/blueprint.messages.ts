import { msg, plural } from '@lingui/core/macro';

export const blueprintMessages = {
  searchSteps: msg`Search a step`,
  steps: msg`Steps`,
  templates: msg`Templates`,
  noMatch: msg`No step matches this search.`,
  paletteHint: msg`Drag a step onto the canvas, or drop a link on empty space to add one.`,

  bashScript: msg`Bash script`,
  bashScriptDetail: msg`A multi-line shell script`,
  shScript: msg`sh script`,
  shScriptDetail: msg`A POSIX shell script`,
  commandDetail: msg`One program and its arguments`,

  addStep: msg`Add a step`,
  addAfter: (id: string) => msg`Add a step after ${id}`,
  insertStep: msg`Insert a step here`,
  keyNavigate: msg`navigate`,
  keyAdd: msg`add`,
  keyCancel: msg`cancel`,
  closeMenu: msg`Close the menu`,

  arrange: msg`Arrange`,
  nodeStyle: msg`Node style`,
  styleDetailed: msg`Detailed`,
  styleMinimal: msg`Simplified`,

  code: msg`Code`,
  after: msg`After`,
  closePanel: msg`Close the panel`,
  close: msg`Close`,
  appliedToDraft: msg`Applied to the draft`,
  detached: msg`No input link`,
  detachedHint: msg`This step has no input link. On save, it is linked to the start of the pipeline.`,
  variables: (count: number) => msg`${plural(count, { one: '# variable', other: '# variables' })}`,
  secrets: (count: number) => msg`${plural(count, { one: '# secret', other: '# secrets' })}`,
};
