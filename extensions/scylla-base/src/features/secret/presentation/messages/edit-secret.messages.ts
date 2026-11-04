import { msg, plural } from '@lingui/core/macro';

export const editSecretMessages = {
  title: (name: string) => msg`Edit secret ${name}`,
  newValue: msg`New value`,
  save: msg`Save`,

  replaceTitle: (name: string) => msg`Replace the value of ${name}?`,
  valueLost: msg`The current value is lost. You cannot recover it.`,
  nextRun: msg`The pipelines that use this secret get the new value at their next run. Jobs that wait for an agent also get it. Running jobs keep the old value.`,
  usedBy: msg`Pipelines that use this secret`,
  noPipeline: msg`No pipeline uses this secret`,
  usageFailed: msg`Could not load the pipelines that use this secret.`,
  usageDenied: msg`You cannot see which pipelines use this secret.`,
  andMore: (count: number) => msg`${plural(count, { one: 'and # more', other: 'and # more' })}`,
  replaceValue: msg`Replace value`,
  cancel: msg`Cancel`,
};
