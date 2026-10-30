import { nodeIdIssue, type NodeId, type NodeIdIssue } from '../structs/node-id.struct.ts';

export type Shell = 'sh' | 'bash';

/** An inline value, or the name of a project secret resolved at dispatch: the client never holds a secret value. */
export type EnvEntry =
  | { key: string; kind: 'literal'; value: string }
  | { key: string; kind: 'secret'; secretRef: string };

interface PipelineNodeBase {
  id: NodeId;
  deps: NodeId[];
  workingDir?: string;
  env: EnvEntry[];
  timeoutSeconds?: number;
  retries?: number;
}

export interface ExecPipelineNodeEntity extends PipelineNodeBase {
  kind: 'exec';
  command: string;
  args: string[];
}

export interface ScriptPipelineNodeEntity extends PipelineNodeBase {
  kind: 'script';
  script: string;
  shell: Shell;
}

/** A node of a pipeline. The pipeline keeps the ids unique and the dependencies whole. */
export type PipelineNodeEntity = ExecPipelineNodeEntity | ScriptPipelineNodeEntity;

/** A node without its place in the graph: the pipeline owns `id` and `deps`. */
export type NodeDefinition =
  | Omit<ExecPipelineNodeEntity, 'id' | 'deps'>
  | Omit<ScriptPipelineNodeEntity, 'id' | 'deps'>;

export const definitionOf = (node: PipelineNodeEntity): NodeDefinition => {
  const base = {
    workingDir: node.workingDir,
    env: node.env,
    timeoutSeconds: node.timeoutSeconds,
    retries: node.retries,
  };
  return node.kind === 'script'
    ? { ...base, kind: 'script', script: node.script, shell: node.shell }
    : { ...base, kind: 'exec', command: node.command, args: node.args };
};

/** What stops a node from running. The node and the inspector both show it. */
export type NodeRunIssue = 'missing-command' | 'empty-script';

export const nodeRunIssue = (definition: NodeDefinition): NodeRunIssue | null => {
  if (definition.kind === 'exec') return definition.command.trim() ? null : 'missing-command';
  return definition.script.trim() ? null : 'empty-script';
};

/** Why the node cannot be saved or run: a refused id first, as the server rejects the whole pipeline. */
export type NodeIssue = { kind: 'id'; issue: NodeIdIssue } | { kind: 'run'; issue: NodeRunIssue };

export const nodeIssue = (node: PipelineNodeEntity): NodeIssue | null => {
  const idIssue = nodeIdIssue(node.id);
  if (idIssue) return { kind: 'id', issue: idIssue };
  const issue = nodeRunIssue(node);
  return issue ? { kind: 'run', issue } : null;
};

/** A node with nothing to run yet: the editor adds it, then the user writes its code. */
export const blankDefinition = (
  kind: PipelineNodeEntity['kind'],
  shell: Shell = 'bash',
): NodeDefinition =>
  kind === 'script'
    ? { kind: 'script', shell, script: '', env: [] }
    : { kind: 'exec', command: '', args: [], env: [] };

/** Replaces what the node runs; its id and its dependencies stay. */
export const withDefinition = (
  node: PipelineNodeEntity,
  definition: NodeDefinition,
): PipelineNodeEntity => ({ id: node.id, deps: node.deps, ...definition });

export const withDependencies = (node: PipelineNodeEntity, deps: NodeId[]): PipelineNodeEntity => ({
  ...node,
  deps,
});

export const withoutDependency = (node: PipelineNodeEntity, id: NodeId): PipelineNodeEntity =>
  node.deps.includes(id) ? { ...node, deps: node.deps.filter(dep => dep !== id) } : node;

/** The node after `from` is renamed `to`: its own id if it is `from`, and its dependency on it. */
export const withRenamedReference = (
  node: PipelineNodeEntity,
  from: NodeId,
  to: NodeId,
): PipelineNodeEntity => ({
  ...node,
  id: node.id === from ? to : node.id,
  deps: node.deps.map(dep => (dep === from ? to : dep)),
});
