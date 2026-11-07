import type { MessageDescriptor } from '@lingui/core';
import { t } from '@scylla/ui/i18n';
import type {
  NeedIssue,
  NodeIssue,
  NodeRunIssue,
  SwitchIssue,
} from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import type { NodeIdIssue } from '@base/features/pipeline/domain/structs/node-id.struct.ts';
import {
  ERROR_PORT,
  portNameIssue,
} from '@base/features/pipeline/domain/structs/port-name.struct.ts';
import { dependencyText } from '../mappers/pipeline-document.mapper.ts';
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

export const NODE_ISSUE_MESSAGES: Record<NodeRunIssue, MessageDescriptor> = {
  'missing-command': nodeMessages.missingCommand,
  'empty-script': nodeMessages.emptyScript,
};

const switchIssueText = (issue: SwitchIssue): string => {
  switch (issue.kind) {
    case 'case-count':
      return t(nodeMessages.caseCount);
    case 'port':
      return t(
        issue.issue.kind === 'empty' ? nodeMessages.portEmpty : nodeMessages.portInvalid(issue.port),
      );
    case 'reserved-port':
      return t(nodeMessages.reservedPort);
    case 'repeated-port':
      return t(nodeMessages.repeatedPort(issue.port));
    case 'rule-count':
      return t(nodeMessages.ruleCount(issue.port));
    case 'not-a-number':
      return t(nodeMessages.notANumber(issue.port, issue.value));
    case 'too-long':
      return t(nodeMessages.textTooLong(issue.port));
    case 'variable':
      return t(nodeMessages.invalidVariable(issue.port, issue.name));
    case 'output-key':
      return t(nodeMessages.invalidOutputKey(issue.port, issue.key));
    case 'output-node':
      return t(nodeMessages.outputNotBefore(issue.port, issue.node));
  }
};

const needIssueText = (issue: NeedIssue): string => {
  switch (issue.kind) {
    case 'merge-without-needs':
      return t(nodeMessages.mergeWithoutNeeds);
    case 'repeated':
      return t(nodeMessages.repeatedNeed(dependencyText(issue.need)));
    case 'unknown-port':
      return t(nodeMessages.unknownPort(issue.need.node, issue.need.port ?? ''));
  }
};

/** What is wrong in a port of a switch as it is typed: its form, or the reserved `error`. Empty is not: it keeps the old name. */
export const switchPortIssueText = (port: string): string | null => {
  if (port.trim() === ERROR_PORT) return t(nodeMessages.reservedPort);
  const issue = portNameIssue(port);
  return issue && issue.kind !== 'empty' ? t(nodeMessages.portInvalid(port)) : null;
};

/** Says what stops the node, whatever the kind of the issue. */
export const nodeIssueText = (issue: NodeIssue): string => {
  switch (issue.kind) {
    case 'id':
      return nodeIdIssueText(issue.issue);
    case 'run':
      return t(NODE_ISSUE_MESSAGES[issue.issue]);
    case 'switch':
      return switchIssueText(issue.issue);
    case 'need':
      return needIssueText(issue.issue);
  }
};
