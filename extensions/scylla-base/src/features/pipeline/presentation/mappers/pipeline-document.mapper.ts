import {
  NUMBER_TESTS,
  TEXT_TESTS,
  testHasRight,
  type Dependency,
  type EnvEntry,
  type Operand,
  type Shell,
  type PipelineNodeEntity,
  type SwitchCase,
  type SwitchRule,
  type SwitchTest,
} from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import {
  DEFAULT_PIPELINE_NAME,
  type PipelineEntity,
} from '@base/features/pipeline/domain/entities/pipeline.entity.ts';

export interface ParsedScript {
  /** `null` for an empty editor and for malformed JSON. */
  document: Record<string, unknown> | null;
  error: string | null;
}

export const parseScript = (script: string): ParsedScript => {
  // An empty editor is not an error, just not saveable yet.
  if (!script.trim()) return { document: null, error: null };

  try {
    return { document: JSON.parse(script) as Record<string, unknown>, error: null };
  } catch (error) {
    return { document: null, error: error instanceof Error ? error.message : 'Invalid JSON' };
  }
};

const parseShell = (value: unknown): Shell => (value === 'bash' ? 'bash' : 'sh');

const MAX_UINT32 = 4_294_967_295;

const parseCount = (value: unknown): number | undefined =>
  Number.isInteger(value) && (value as number) >= 0 && (value as number) <= MAX_UINT32
    ? (value as number)
    : undefined;

/** Tolerates partial input. */
const parseEnv = (value: unknown): EnvEntry[] => {
  if (!Array.isArray(value)) return [];

  return value.map((raw): EnvEntry => {
    const entry = (raw ?? {}) as Record<string, unknown>;
    const key = typeof entry.key === 'string' ? entry.key : '';

    if (entry.kind === 'secret' || typeof entry.secretRef === 'string') {
      return {
        key,
        kind: 'secret',
        secretRef: typeof entry.secretRef === 'string' ? entry.secretRef : '',
      };
    }
    return { key, kind: 'literal', value: typeof entry.value === 'string' ? entry.value : '' };
  });
};

const serializeEnv = (env: EnvEntry[]): Record<string, unknown>[] =>
  env.map(entry =>
    entry.kind === 'secret'
      ? { key: entry.key, kind: 'secret', secretRef: entry.secretRef }
      : { key: entry.key, kind: 'literal', value: entry.value },
  );

/** A need as the document writes it: `build`, or `is-main:true`. A node id and a port never hold a `:`. */
export const dependencyText = ({ node, port }: Dependency): string =>
  port ? `${node}:${port}` : node;

/** An empty port is no port. */
export const parseDependency = (text: string): Dependency => {
  const at = text.indexOf(':');
  const port = at === -1 ? '' : text.slice(at + 1);
  return port ? { node: text.slice(0, at), port } : { node: at === -1 ? text : text.slice(0, at) };
};

const textOf = (record: Record<string, unknown>, key: string): string =>
  typeof record[key] === 'string' ? record[key] : '';

const parseOperand = (value: unknown): Operand => {
  const operand = (value ?? {}) as Record<string, unknown>;
  if (operand.kind === 'var') return { kind: 'var', name: textOf(operand, 'name') };
  if (operand.kind === 'output')
    return { kind: 'output', node: textOf(operand, 'node'), key: textOf(operand, 'key') };
  return { kind: 'literal', value: textOf(operand, 'value') };
};

const SWITCH_TESTS: readonly unknown[] = [...TEXT_TESTS, ...NUMBER_TESTS];

/** A right value goes with each test but `empty` and `not_empty`: it is added or dropped to fit. */
const parseRule = (value: unknown): SwitchRule => {
  const rule = (value ?? {}) as Record<string, unknown>;
  const test = SWITCH_TESTS.includes(rule.test) ? (rule.test as SwitchTest) : 'equals';
  return {
    left: parseOperand(rule.left),
    test,
    ...(testHasRight(test) ? { right: parseOperand(rule.right) } : {}),
  };
};

const parseCase = (value: unknown): SwitchCase => {
  const entry = (value ?? {}) as Record<string, unknown>;
  return {
    port: textOf(entry, 'port'),
    combinator: entry.combinator === 'any' ? 'any' : 'all',
    rules: Array.isArray(entry.rules) ? entry.rules.map(parseRule) : [],
  };
};

const KINDS: readonly unknown[] = [
  'script',
  'exec',
  'switch',
  'merge',
] satisfies PipelineNodeEntity['kind'][];

/** An explicit `kind` wins; else the present field decides. */
const kindOf = (node: Record<string, unknown>): PipelineNodeEntity['kind'] => {
  if (KINDS.includes(node.kind)) return node.kind as PipelineNodeEntity['kind'];
  if (typeof node.command === 'string') return 'exec';
  if (typeof node.script === 'string') return 'script';
  if (node.switch && typeof node.switch === 'object') return 'switch';
  return node.merge && typeof node.merge === 'object' ? 'merge' : 'exec';
};

const parseNode = (node: Record<string, unknown>): PipelineNodeEntity => {
  const id = typeof node.id === 'string' ? node.id : '';
  const deps = Array.isArray(node.deps)
    ? node.deps.filter(dep => typeof dep === 'string').map(parseDependency)
    : [];
  const kind = kindOf(node);

  if (kind === 'merge') return { id, deps, kind };
  if (kind === 'switch') {
    const definition = (node.switch ?? {}) as Record<string, unknown>;
    return {
      id,
      deps,
      env: parseEnv(node.env),
      kind,
      cases: Array.isArray(definition.cases) ? definition.cases.map(parseCase) : [],
      // Serializing writes `null` for no otherwise: it reads back as none.
      ...(typeof definition.otherwise === 'string' ? { otherwise: definition.otherwise } : {}),
      allMatches: definition.allMatches === true,
    };
  }

  const base = {
    id,
    deps,
    // Serializing writes `''` for no directory: it reads back as none, so a node round-trips.
    workingDir:
      typeof node.workingDir === 'string' && node.workingDir ? node.workingDir : undefined,
    env: parseEnv(node.env),
    timeoutSeconds: parseCount(node.timeoutSeconds),
    // Serializing writes `0` for no retry: it reads back as none.
    retries: parseCount(node.retries) || undefined,
  };

  if (kind === 'script') {
    return {
      ...base,
      kind: 'script',
      script: (node.script as string) ?? '',
      shell: parseShell(node.shell),
    };
  }
  return {
    ...base,
    kind: 'exec',
    command: (node.command as string) ?? '',
    args: (node.args as string[]) ?? [],
  };
};

const serializeNode = (node: PipelineNodeEntity): Record<string, unknown> => {
  const deps = node.deps.map(dependencyText);
  if (node.kind === 'merge') return { id: node.id, deps, kind: 'merge', merge: {} };
  if (node.kind === 'switch')
    return {
      id: node.id,
      deps,
      env: serializeEnv(node.env),
      kind: 'switch',
      switch: {
        cases: node.cases,
        otherwise: node.otherwise ?? null,
        allMatches: node.allMatches,
      },
    };

  const base = {
    id: node.id,
    deps,
    workingDir: node.workingDir ?? '',
    env: serializeEnv(node.env),
    timeoutSeconds: node.timeoutSeconds ?? null,
    retries: node.retries ?? 0,
  };

  if (node.kind === 'script') {
    return { ...base, kind: 'script', shell: node.shell, script: node.script };
  }
  return { ...base, kind: 'exec', command: node.command, args: node.args };
};

export const nodesOf = (document: Record<string, unknown> | null): PipelineNodeEntity[] =>
  ((document?.nodes ?? []) as Record<string, unknown>[]).map(parseNode);

export const nameOf = (document: Record<string, unknown> | null): string =>
  (document?.name as string) ?? DEFAULT_PIPELINE_NAME;

/** The document of a pipeline: only the fields the editor owns, so that no id or date travels back on save. */
export const toDocument = ({
  name,
  projectId,
  nodes,
}: Pick<PipelineEntity, 'name' | 'projectId' | 'nodes'>): string =>
  JSON.stringify({ name, projectId, nodes: nodes.map(serializeNode) }, null, 2);

/** Replaces the nodes and keeps the rest (the name). Seeds a minimal document when there is none. */
export const withNodes = (
  document: Record<string, unknown> | null,
  nodes: PipelineNodeEntity[],
  projectId: string,
): string =>
  document
    ? JSON.stringify({ ...document, nodes: nodes.map(serializeNode) }, null, 2)
    : toDocument({ name: DEFAULT_PIPELINE_NAME, projectId, nodes });

export const withName = (document: Record<string, unknown> | null, name: string): string | null =>
  document ? JSON.stringify({ ...document, name }, null, 2) : null;
