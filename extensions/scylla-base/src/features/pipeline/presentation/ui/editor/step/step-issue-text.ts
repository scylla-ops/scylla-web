import type { MessageDescriptor } from '@lingui/core';
import { t } from '@scylla/ui/i18n';
import type {
  NodeIdIssue,
  StepIssue,
} from '@base/features/pipeline/domain/structs/step-issue.struct.ts';
import { stepMessages } from './step.messages.ts';

/** A space is invisible between quotes: it is shown as `␣`. */
const quoted = (character: string) => `"${character === ' ' ? '␣' : character}"`;

/** Says what is wrong in the id, and what the server accepts. */
export const nodeIdIssueText = (issue: NodeIdIssue): string => {
  switch (issue.kind) {
    case 'empty':
      return t(stepMessages.idEmpty);
    case 'invalid-characters':
      return t(stepMessages.idInvalidCharacters(issue.characters.map(quoted).join(', ')));
    case 'too-long':
      return t(stepMessages.idTooLong(issue.length));
  }
};

export const ISSUE_MESSAGES: Record<StepIssue, MessageDescriptor> = {
  'missing-command': stepMessages.missingCommand,
  'empty-script': stepMessages.emptyScript,
};
