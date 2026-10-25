import type { MessageDescriptor } from '@lingui/core';
import { t } from '@scylla/ui/i18n';
import type { StepIssue } from '@base/features/pipeline/domain/entities/pipeline-step.entity.ts';
import type { StepIdIssue } from '@base/features/pipeline/domain/structs/step-id.struct.ts';
import { stepMessages } from '../messages/step.messages.ts';

/** A space is invisible between quotes: it is shown as `␣`. */
const quoted = (character: string) => `"${character === ' ' ? '␣' : character}"`;

/** Says what is wrong in the id, and what the server accepts. */
export const stepIdIssueText = (issue: StepIdIssue): string => {
  switch (issue.kind) {
    case 'empty':
      return t(stepMessages.idEmpty);
    case 'invalid-characters':
      return t(stepMessages.idInvalidCharacters(issue.characters.map(quoted).join(', ')));
    case 'too-long':
      return t(stepMessages.idTooLong(issue.length));
  }
};

export const STEP_ISSUE_MESSAGES: Record<StepIssue, MessageDescriptor> = {
  'missing-command': stepMessages.missingCommand,
  'empty-script': stepMessages.emptyScript,
};
