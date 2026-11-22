import type { LucideIcon } from '@scylla/ui';
import { t } from '@scylla/ui/i18n';
import { cn } from '@scylla/ui/utils';
import {
  nodeIssue,
  portsOf,
  runsStep,
  type NodeIssue,
  type PipelineNodeEntity,
  type NodeDefinition,
} from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import {
  ERROR_PORT,
  type PortName,
} from '@base/features/pipeline/domain/structs/port-name.struct.ts';
import { pipelineMessages } from '../messages/pipeline.messages.ts';
import { nodeMessages } from '../messages/node.messages.ts';
import { nodeIssueText } from './node-issue.presenter.ts';
import { KIND_TONES, nodeIcon } from './node-kind.presenter.ts';

/** A shebang, a comment or a `set -e` says nothing about what the node does. */
const isNoise = (line: string) => line.startsWith('#') || /^set\s/.test(line);

/** One line that tells what the node runs: the command, or the first meaningful script line. A switch and a merge run nothing. */
export const nodePreview = (definition: NodeDefinition): string => {
  if (definition.kind === 'exec') return [definition.command, ...definition.args].join(' ').trim();
  if (definition.kind !== 'script') return '';

  return (
    definition.script
      .split('\n')
      .map(line => line.trim())
      .find(line => line !== '' && !isNoise(line)) ?? ''
  );
};

export const envCounts = (definition: NodeDefinition) => {
  const env = definition.kind === 'merge' ? [] : definition.env;
  const secrets = env.filter(entry => entry.kind === 'secret').length;
  return { variables: env.length - secrets, secrets };
};

/** A source handle of a node: no port, a port of a switch, or the red `error` port. */
export interface NodeOutput {
  port?: PortName;
  error?: true;
}

/** What every node appearance renders: computed once, so the views only lay it out. */
export interface NodeSummary {
  icon: LucideIcon;
  tone: (typeof KIND_TONES)[PipelineNodeEntity['kind']];
  /** `bash` and `sh` are names, not words: only `command`, `switch` and `merge` are translated. */
  kind: string;
  preview: string;
  /** Why the node cannot be saved or run: a refused id first, the server rejects the pipeline. */
  problem: { label: string; detail: string } | null;
  variables: number;
  secrets: number;
  workingDir?: string;
  /** In the order of the handles, top to bottom. */
  outputs: NodeOutput[];
}

export interface SummaryOptions {
  /** The icon of the template whose code the node runs. */
  iconHint?: string;
  repeated?: boolean;
  /** The issue that the pipeline finds for the node; by default, the node's own. */
  issue?: NodeIssue | null;
  /** The node shows its `error` port: its toggle is on, or a need names it. */
  errorPort?: boolean;
}

const kindLabel = (node: PipelineNodeEntity): string => {
  if (node.kind === 'script') return node.shell;
  if (node.kind === 'exec') return t(nodeMessages.kindCommand);
  return t(node.kind === 'switch' ? nodeMessages.kindSwitch : nodeMessages.kindMerge);
};

/** A switch has one handle for each port, in order; a node that runs a step adds `error` to its own. */
const outputsOf = (node: PipelineNodeEntity, errorPort: boolean): NodeOutput[] => {
  if (node.kind === 'switch') return portsOf(node).map(port => ({ port }));
  return runsStep(node) && errorPort ? [{}, { port: ERROR_PORT, error: true }] : [{}];
};

/** Reads `t()`: called in a `$derived`, it follows a locale switch. */
export const summarize = (
  node: PipelineNodeEntity,
  { iconHint, repeated = false, issue = nodeIssue(node), errorPort = false }: SummaryOptions = {},
): NodeSummary => ({
  icon: nodeIcon(node.kind, iconHint),
  tone: KIND_TONES[node.kind],
  kind: kindLabel(node),
  preview: nodePreview(node),
  problem: repeated ? repeatedProblem() : problemOf(issue),
  ...envCounts(node),
  workingDir: runsStep(node) ? node.workingDir : undefined,
  outputs: outputsOf(node, errorPort),
});

/** Another node has the same id: the server refuses the pipeline, and the graph cannot edit it. */
const repeatedProblem = (): NonNullable<NodeSummary['problem']> => ({
  label: t(pipelineMessages.repeatedNodeId),
  detail: t(pipelineMessages.repeatedHint),
});

const PROBLEM_LABELS = {
  id: nodeMessages.invalidId,
  switch: nodeMessages.invalidSwitch,
  need: nodeMessages.invalidLink,
};

const problemOf = (issue: NodeIssue | null): NodeSummary['problem'] => {
  if (!issue) return null;
  const detail = nodeIssueText(issue);
  return { label: issue.kind === 'run' ? detail : t(PROBLEM_LABELS[issue.kind]), detail };
};

export const handleClass = (summary: NodeSummary, selected: boolean) =>
  cn('size-2.5! border-[1.5px]! bg-card!', selected ? summary.tone.handle : 'border-input!');

/** The `error` handle is red, selected or not. */
export const errorHandleClass = 'size-2.5! border-[1.5px]! border-destructive! bg-destructive!';
