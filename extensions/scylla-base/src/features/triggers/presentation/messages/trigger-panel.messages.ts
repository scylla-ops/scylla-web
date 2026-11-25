import { msg, plural } from '@lingui/core/macro';

/** The triggers of a pipeline in the panel of its start node. Keep the msgids. */
export const triggerPanelMessages = {
  fromFile: msg`From the file`,
  storedInScylla: msg`Stored in Scylla`,
  lastRun: (time: string) => msg`Last run ${time}`,
  nextRun: (time: string) => msg`Next run ${time}`,
  stopped: msg`Stopped: it starts no run`,
  stoppedWebhook: msg`Stopped: its URL returns 404`,
  noTrigger: msg`No trigger yet. Only a manual run starts this pipeline.`,
  noStoredTrigger: msg`No schedule or webhook in Scylla yet.`,

  addTrigger: msg`Add trigger`,
  newSchedule: msg`New schedule`,
  fullEditorHint: msg`For inputs, open the full editor.`,
  openFullEditor: msg`Full editor`,
  triggersPage: msg`All triggers`,

  triggerCount: (count: number) => msg`${plural(count, { one: '# trigger', other: '# triggers' })}`,
};
