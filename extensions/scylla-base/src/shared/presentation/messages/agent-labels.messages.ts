import { msg } from '@lingui/core/macro';

export const agentLabelsMessages = {
  fromMachine: msg`From the machine`,
  fromMachineHint: msg`The machine of the agent gives this label at each connection.`,
  add: msg`Add`,
  newLabel: msg`New label`,
  placeholder: msg`deploy`,
  removeLabel: (label: string) => msg`Remove ${label}`,
  formatIssue: msg`Use 1 to 32 lower case letters, digits, dots, dashes or underscores. Start with a letter or a digit.`,
  duplicateIssue: msg`This label is already in the list.`,
  tooManyIssue: msg`The list has 16 labels, the maximum.`,
};
