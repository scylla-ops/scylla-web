import { nodeIdIssue, type NodeId, type NodeIdIssue } from '../structs/node-id.struct.ts';
import {
  ERROR_PORT,
  portNameIssue,
  type PortName,
  type PortNameIssue,
} from '../structs/port-name.struct.ts';

export type Shell = 'sh' | 'bash';

/** An inline value, or the name of a project secret resolved at dispatch: the client never holds a secret value. */
export type EnvEntry =
  | { key: string; kind: 'literal'; value: string }
  | { key: string; kind: 'secret'; secretRef: string };

/**
 * A need of a node: another node, and one of its ports or none. No port opens when the node
 * completed; a port opens when the switch chose it, or (`error`) when the node failed.
 */
export interface Dependency {
  node: NodeId;
  port?: PortName;
}

interface PipelineNodeBase {
  id: NodeId;
  deps: Dependency[];
}

/** What only a node that runs a step has. */
interface StepFields {
  workingDir?: string;
  env: EnvEntry[];
  timeoutSeconds?: number;
  retries?: number;
  /** The image of the container of the node, e.g. `rust:1.97`. None runs it on the agent. */
  image?: string;
}

export interface ExecPipelineNodeEntity extends PipelineNodeBase, StepFields {
  kind: 'exec';
  command: string;
  args: string[];
}

export interface ScriptPipelineNodeEntity extends PipelineNodeBase, StepFields {
  kind: 'script';
  script: string;
  shell: Shell;
}

export type Combinator = 'all' | 'any';

export const TEXT_TESTS = [
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'starts_with',
  'ends_with',
  'empty',
  'not_empty',
] as const;

/** Each side is read as a finite number: a text that is not one fails the switch. */
export const NUMBER_TESTS = [
  'number_eq',
  'number_ne',
  'number_gt',
  'number_ge',
  'number_lt',
  'number_le',
] as const;

export type SwitchTest = (typeof TEXT_TESTS)[number] | (typeof NUMBER_TESTS)[number];

/** A text, a variable of the switch node, or a key of the output file of a node before it. */
export type Operand =
  | { kind: 'literal'; value: string }
  | { kind: 'var'; name: string }
  | { kind: 'output'; node: NodeId; key: string };

/** `right` is there for each test but `empty` and `not_empty`. */
export interface SwitchRule {
  left: Operand;
  test: SwitchTest;
  right?: Operand;
}

export interface SwitchCase {
  port: PortName;
  combinator: Combinator;
  rules: SwitchRule[];
}

/**
 * A node with no process: the agent checks its cases in order and opens the port of the first
 * one that matches (of each one with `allMatches`), else `otherwise`, else no port.
 */
export interface SwitchPipelineNodeEntity extends PipelineNodeBase {
  env: EnvEntry[];
  kind: 'switch';
  cases: SwitchCase[];
  otherwise?: PortName;
  allMatches: boolean;
}

/** A node with no process that joins branches again: it runs when one of its needs or more is open. */
export interface MergePipelineNodeEntity extends PipelineNodeBase {
  kind: 'merge';
}

/** A node of a pipeline. The pipeline keeps the ids unique and the dependencies whole. */
export type PipelineNodeEntity =
  | ExecPipelineNodeEntity
  | ScriptPipelineNodeEntity
  | SwitchPipelineNodeEntity
  | MergePipelineNodeEntity;

export type NodeKind = PipelineNodeEntity['kind'];

/** A node without its place in the graph: the pipeline owns `id` and `deps`. */
export type NodeDefinition =
  | Omit<ExecPipelineNodeEntity, 'id' | 'deps'>
  | Omit<ScriptPipelineNodeEntity, 'id' | 'deps'>
  | Omit<SwitchPipelineNodeEntity, 'id' | 'deps'>
  | Omit<MergePipelineNodeEntity, 'id' | 'deps'>;

export type SwitchDefinition = Extract<NodeDefinition, { kind: 'switch' }>;

/** A command or a script: a node with a process, which can retry, time out and fail. */
export const runsStep = <T extends { kind: NodeKind }>(
  node: T,
): node is Extract<T, { kind: 'exec' | 'script' }> => node.kind === 'exec' || node.kind === 'script';

export const testHasRight = (test: SwitchTest): boolean => test !== 'empty' && test !== 'not_empty';

export const isNumberTest = (test: SwitchTest): boolean => test.startsWith('number_');

/** The ports that a need on this node can name: its cases and `otherwise`, or `error`. */
export const portsOf = (node: NodeDefinition): PortName[] => {
  if (node.kind === 'switch')
    return [
      ...node.cases.map(({ port }) => port),
      ...(node.otherwise === undefined ? [] : [node.otherwise]),
    ];
  return runsStep(node) ? [ERROR_PORT] : [];
};

export const sameDependency = (a: Dependency, b: Dependency): boolean =>
  a.node === b.node && a.port === b.port;

export const definitionOf = (node: PipelineNodeEntity): NodeDefinition => {
  if (node.kind === 'merge') return { kind: 'merge' };
  if (node.kind === 'switch')
    return {
      env: node.env,
      kind: 'switch',
      cases: node.cases,
      otherwise: node.otherwise,
      allMatches: node.allMatches,
    };

  const base = {
    workingDir: node.workingDir,
    env: node.env,
    timeoutSeconds: node.timeoutSeconds,
    retries: node.retries,
    ...(node.image ? { image: node.image } : {}),
  };
  return node.kind === 'script'
    ? { ...base, kind: 'script', script: node.script, shell: node.shell }
    : { ...base, kind: 'exec', command: node.command, args: node.args };
};

/** What stops a node from running. The node and the inspector both show it. */
export type NodeRunIssue = 'missing-command' | 'empty-script';

export const nodeRunIssue = (definition: NodeDefinition): NodeRunIssue | null => {
  if (definition.kind === 'exec') return definition.command.trim() ? null : 'missing-command';
  if (definition.kind === 'script') return definition.script.trim() ? null : 'empty-script';
  return null;
};

/**
 * What the server refuses in a switch; `port` names the case of the value. The pipeline finds
 * `output-node`: an output of a node that does not run a step before the switch.
 */
export type SwitchIssue =
  | { kind: 'case-count'; count: number }
  | { kind: 'port'; port: PortName; issue: PortNameIssue }
  /** `error` is the error port of a node that runs a step: no case and no `otherwise` has it. */
  | { kind: 'reserved-port'; port: PortName }
  | { kind: 'repeated-port'; port: PortName }
  | { kind: 'rule-count'; port: PortName; count: number }
  | { kind: 'not-a-number'; port: PortName; value: string }
  | { kind: 'too-long'; port: PortName }
  | { kind: 'variable'; port: PortName; name: string }
  | { kind: 'output-key'; port: PortName; key: string }
  | { kind: 'output-node'; port: PortName; node: NodeId };

/** What the server refuses in the needs of a node. The pipeline finds `unknown-port`. */
export type NeedIssue =
  | { kind: 'merge-without-needs' }
  | { kind: 'repeated'; need: Dependency }
  | { kind: 'unknown-port'; need: Dependency };

/** Why the node cannot be saved or run: a refused id first, as the server rejects the whole pipeline. */
export type NodeIssue =
  | { kind: 'id'; issue: NodeIdIssue }
  | { kind: 'run'; issue: NodeRunIssue }
  | { kind: 'switch'; issue: SwitchIssue }
  | { kind: 'need'; issue: NeedIssue };

/** The limits of the server (`Switch` and `Node::MAX_TEXT` in scylla-domain). */
export const MAX_CASES = 16;
export const MAX_RULES = 32;
const MAX_TEXT_BYTES = 64 * 1024;

/** A letter or an underscore, then letters, digits or underscores: at most 256. */
const VARIABLE_NAME = /^[A-Za-z_]\w{0,255}$/;
/** The form that `f64::from_str` reads, once trimmed. */
const NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

const isNumber = (text: string) =>
  NUMBER.test(text.trim()) && Number.isFinite(Number(text.trim()));

const tooLong = (text: string) =>
  text.includes('\0') || new TextEncoder().encode(text).length > MAX_TEXT_BYTES;

const operandIssue = (operand: Operand, test: SwitchTest, port: PortName): SwitchIssue | null => {
  if (operand.kind === 'var')
    return VARIABLE_NAME.test(operand.name) ? null : { kind: 'variable', port, name: operand.name };
  if (operand.kind === 'output')
    return VARIABLE_NAME.test(operand.key) ? null : { kind: 'output-key', port, key: operand.key };
  if (tooLong(operand.value)) return { kind: 'too-long', port };
  return isNumberTest(test) && !isNumber(operand.value)
    ? { kind: 'not-a-number', port, value: operand.value }
    : null;
};

/** The first value of the switch that the server refuses. */
export const switchIssue = (node: SwitchDefinition): SwitchIssue | null => {
  const { cases } = node;
  if (cases.length === 0 || cases.length > MAX_CASES)
    return { kind: 'case-count', count: cases.length };

  const ports = portsOf(node);
  for (const port of ports) {
    const issue = portNameIssue(port);
    if (issue) return { kind: 'port', port, issue };
    if (port === ERROR_PORT) return { kind: 'reserved-port', port };
  }
  const repeated = ports.find((port, index) => ports.indexOf(port) !== index);
  if (repeated !== undefined) return { kind: 'repeated-port', port: repeated };

  for (const { port, rules } of cases) {
    if (rules.length === 0 || rules.length > MAX_RULES)
      return { kind: 'rule-count', port, count: rules.length };
    for (const rule of rules) {
      const issue =
        operandIssue(rule.left, rule.test, port) ??
        (rule.right ? operandIssue(rule.right, rule.test, port) : null);
      if (issue) return issue;
    }
  }
  return null;
};

/** A merge with no need, or the same need two times. */
export const needIssue = (node: PipelineNodeEntity): NeedIssue | null => {
  if (node.kind === 'merge' && node.deps.length === 0) return { kind: 'merge-without-needs' };
  const repeated = node.deps.find(
    (dep, index) => node.deps.findIndex(other => sameDependency(dep, other)) !== index,
  );
  return repeated ? { kind: 'repeated', need: repeated } : null;
};

/** What the node alone shows. `nodeIssues` of the pipeline adds what the other nodes decide. */
export const nodeIssue = (node: PipelineNodeEntity): NodeIssue | null => {
  const idIssue = nodeIdIssue(node.id);
  if (idIssue) return { kind: 'id', issue: idIssue };
  const issue = nodeRunIssue(node);
  if (issue) return { kind: 'run', issue };
  const switchProblem = node.kind === 'switch' ? switchIssue(node) : null;
  if (switchProblem) return { kind: 'switch', issue: switchProblem };
  const need = needIssue(node);
  return need ? { kind: 'need', issue: need } : null;
};

/** An empty value of a kind: the user fills it. */
export const blankOperand = (kind: Operand['kind']): Operand => {
  if (kind === 'var') return { kind, name: '' };
  if (kind === 'output') return { kind, node: '', key: '' };
  return { kind, value: '' };
};

/** A rule with nothing in it yet, that the server accepts: two empty texts. */
export const blankRule = (): SwitchRule => ({
  left: { kind: 'literal', value: '' },
  test: 'equals',
  right: { kind: 'literal', value: '' },
});

export const blankCase = (port: PortName): SwitchCase => ({
  port,
  combinator: 'all',
  rules: [blankRule()],
});

/** A node with nothing to run yet: the editor adds it, then the user writes its code. */
export const blankDefinition = (kind: NodeKind, shell: Shell = 'bash'): NodeDefinition => {
  switch (kind) {
    case 'script':
      return { kind: 'script', shell, script: '', env: [] };
    case 'exec':
      return { kind: 'exec', command: '', args: [], env: [] };
    case 'switch':
      return {
        env: [],
        kind: 'switch',
        cases: [blankCase('case-1'), blankCase('case-2')],
        allMatches: false,
      };
    case 'merge':
      return { kind: 'merge' };
  }
};

/** Replaces what the node runs; its id and its dependencies stay. */
export const withDefinition = (
  node: PipelineNodeEntity,
  definition: NodeDefinition,
): PipelineNodeEntity => ({ id: node.id, deps: node.deps, ...definition });

export const withDependencies = (
  node: PipelineNodeEntity,
  deps: Dependency[],
): PipelineNodeEntity => ({ ...node, deps });

/** Drops each need on the node, whatever its port. */
export const withoutDependency = (node: PipelineNodeEntity, id: NodeId): PipelineNodeEntity =>
  node.deps.some(dep => dep.node === id)
    ? { ...node, deps: node.deps.filter(dep => dep.node !== id) }
    : node;

const renamedOperand = (operand: Operand, from: NodeId, to: NodeId): Operand =>
  operand.kind === 'output' && operand.node === from ? { ...operand, node: to } : operand;

/**
 * The node after `from` is renamed `to`: its own id if it is `from`, its needs on it (with their
 * ports), and the outputs of it that its switch reads.
 */
export const withRenamedReference = (
  node: PipelineNodeEntity,
  from: NodeId,
  to: NodeId,
): PipelineNodeEntity => {
  const renamed = {
    ...node,
    id: node.id === from ? to : node.id,
    deps: node.deps.map(dep => (dep.node === from ? { ...dep, node: to } : dep)),
  };
  if (renamed.kind !== 'switch') return renamed;
  return {
    ...renamed,
    cases: renamed.cases.map(c => ({
      ...c,
      rules: c.rules.map(rule => ({
        ...rule,
        left: renamedOperand(rule.left, from, to),
        ...(rule.right ? { right: renamedOperand(rule.right, from, to) } : {}),
      })),
    })),
  };
};
