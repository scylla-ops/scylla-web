/**
 * A label of an agent. A pipeline asks labels, and only an agent with each of them runs its
 * jobs. The rule of the server: 1 to 32 lower case letters, digits, dots, dashes or underscores,
 * with a letter or a digit first.
 */
export const AGENT_LABEL_PATTERN = /^[a-z0-9][a-z0-9._-]{0,31}$/;

/** The most labels that the admins give to an agent, and that a pipeline asks. */
export const MAX_AGENT_LABELS = 16;

/** Why a label cannot go in a list. */
export type AgentLabelIssue = 'format' | 'duplicate' | 'too-many';

/** The issue of a new label for a list, or `null` when the list takes it. Trim the text first. */
export const agentLabelIssue = (
  label: string,
  labels: readonly string[],
): AgentLabelIssue | null => {
  if (!AGENT_LABEL_PATTERN.test(label)) return 'format';
  if (labels.includes(label)) return 'duplicate';
  if (labels.length >= MAX_AGENT_LABELS) return 'too-many';
  return null;
};

/** The two lists have the same labels in the same order. */
export const sameAgentLabels = (one: readonly string[], other: readonly string[]): boolean =>
  one.length === other.length && one.every((label, index) => label === other[index]);
