import type {
  EnvEntry,
  Shell,
  PipelineNodeEntity,
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

const parseNode = (node: Record<string, unknown>): PipelineNodeEntity => {
  const base = {
    id: typeof node.id === 'string' ? node.id : '',
    deps: Array.isArray(node.deps) ? node.deps.filter(dep => typeof dep === 'string') : [],
    // Serializing writes `''` for no directory: it reads back as none, so a node round-trips.
    workingDir:
      typeof node.workingDir === 'string' && node.workingDir ? node.workingDir : undefined,
    env: parseEnv(node.env),
    timeoutSeconds: parseCount(node.timeoutSeconds),
    // Serializing writes `0` for no retry: it reads back as none.
    retries: parseCount(node.retries) || undefined,
  };

  // An explicit `kind` wins; else the present field decides.
  const hasCommand = typeof node.command === 'string';
  const hasScript = typeof node.script === 'string';
  const kind =
    node.kind === 'script' || node.kind === 'exec'
      ? node.kind
      : hasCommand
        ? 'exec'
        : hasScript
          ? 'script'
          : 'exec';

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
  const base = {
    id: node.id,
    deps: node.deps,
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
