import type { LucideIcon } from '@scylla/ui';
import { t } from '@scylla/ui/i18n';
import { cn } from '@scylla/ui/utils';
import {
  nodeProblem,
  type PipelineNodeEntity,
  type NodeDefinition,
} from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import { pipelineMessages } from '../messages/pipeline.messages.ts';
import { nodeMessages } from '../messages/node.messages.ts';
import { NODE_ISSUE_MESSAGES, nodeIdIssueText } from './node-issue.presenter.ts';
import { KIND_TONES, nodeIcon } from './node-kind.presenter.ts';

/** A shebang, a comment or a `set -e` says nothing about what the node does. */
const isNoise = (line: string) => line.startsWith('#') || /^set\s/.test(line);

/** One line that tells what the node runs: the command, or the first meaningful script line. */
export const nodePreview = (definition: NodeDefinition): string => {
  if (definition.kind === 'exec') return [definition.command, ...definition.args].join(' ').trim();

  return (
    definition.script
      .split('\n')
      .map(line => line.trim())
      .find(line => line !== '' && !isNoise(line)) ?? ''
  );
};

export const envCounts = (definition: NodeDefinition) => {
  const secrets = definition.env.filter(entry => entry.kind === 'secret').length;
  return { variables: definition.env.length - secrets, secrets };
};

/** What every node appearance renders: computed once, so the views only lay it out. */
export interface NodeSummary {
  icon: LucideIcon;
  tone: (typeof KIND_TONES)[PipelineNodeEntity['kind']];
  /** `bash` and `sh` are names, not words: only `command` is translated. */
  kind: string;
  preview: string;
  /** Why the node cannot be saved or run: a refused id first, the server rejects the pipeline. */
  problem: { label: string; detail: string } | null;
  variables: number;
  secrets: number;
  workingDir?: string;
}

/**
 * Reads `t()`: called in a `$derived`, it follows a locale switch. `iconHint`: the icon of the
 * template whose code the node runs.
 */
export const summarize = (
  node: PipelineNodeEntity,
  iconHint?: string,
  repeated = false,
): NodeSummary => ({
  icon: nodeIcon(node.kind, iconHint),
  tone: KIND_TONES[node.kind],
  kind: node.kind === 'script' ? node.shell : t(nodeMessages.kindCommand),
  preview: nodePreview(node),
  problem: repeated ? repeatedProblem() : problemOf(node),
  ...envCounts(node),
  workingDir: node.workingDir,
});

/** Another node has the same id: the server refuses the pipeline, and the graph cannot edit it. */
const repeatedProblem = (): NonNullable<NodeSummary['problem']> => ({
  label: t(pipelineMessages.repeatedNodeId),
  detail: t(pipelineMessages.repeatedHint),
});

const problemOf = (node: PipelineNodeEntity): NodeSummary['problem'] => {
  const problem = nodeProblem(node);
  if (!problem) return null;
  if (problem.kind === 'id')
    return { label: t(nodeMessages.invalidId), detail: nodeIdIssueText(problem.issue) };

  const text = t(NODE_ISSUE_MESSAGES[problem.issue]);
  return { label: text, detail: text };
};

export const handleClass = (summary: NodeSummary, selected: boolean) =>
  cn('size-2.5! border-[1.5px]! bg-card!', selected ? summary.tone.handle : 'border-input!');
