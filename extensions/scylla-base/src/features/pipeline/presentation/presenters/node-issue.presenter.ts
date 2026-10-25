import type { MessageDescriptor } from '@lingui/core';
import { t } from '@scylla/ui/i18n';
import type { NodeIssue } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import type { NodeIdIssue } from '@base/features/pipeline/domain/structs/node-id.struct.ts';
import { nodeMessages } from '../messages/node.messages.ts';

/** A space is invisible between quotes: it is shown as `␣`. */
const quoted = (character: string) => `"${character === ' ' ? '␣' : character}"`;

/** Says what is wrong in the id, and what the server accepts. */
export const nodeIdIssueText = (issue: NodeIdIssue): string => {
  switch (issue.kind) {
    case 'empty':
      return t(nodeMessages.idEmpty);
    case 'invalid-characters':
      return t(nodeMessages.idInvalidCharacters(issue.characters.map(quoted).join(', ')));
    case 'too-long':
      return t(nodeMessages.idTooLong(issue.length));
  }
};

export const NODE_ISSUE_MESSAGES: Record<NodeIssue, MessageDescriptor> = {
  'missing-command': nodeMessages.missingCommand,
  'empty-script': nodeMessages.emptyScript,
};
