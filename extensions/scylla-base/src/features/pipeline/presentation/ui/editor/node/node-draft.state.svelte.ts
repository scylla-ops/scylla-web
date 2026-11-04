import type {
  Shell,
  PipelineNodeEntity,
  NodeDefinition,
} from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import {
  toEnvEntry,
  toEnvRow,
  type EnvRow,
} from '@base/features/pipeline/presentation/mappers/env-row.mapper.ts';
import { nodeIdIssue, toNodeId } from '@base/features/pipeline/domain/structs/node-id.struct.ts';
import { nodeRunIssue } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';

export const MAX_TIMEOUT_SECONDS = 604_800;
export const MAX_RETRIES = 10;

const wholeNumber = (raw: string): number | null =>
  /^\d+$/.test(raw.trim()) ? Number(raw.trim()) : null;

// `undefined`: no timeout. `null`: out of range.
const timeoutOf = (raw: string): number | undefined | null => {
  if (!raw.trim()) return undefined;
  const seconds = wholeNumber(raw);
  return seconds !== null && seconds >= 1 && seconds <= MAX_TIMEOUT_SECONDS ? seconds : null;
};

const retriesOf = (raw: string): number | null => {
  const retries = raw.trim() ? wholeNumber(raw) : 0;
  return retries !== null && retries <= MAX_RETRIES ? retries : null;
};

export interface NodeDraftParams {
  /** Read once: a draft is built again for another node. */
  node: PipelineNodeEntity;
  /** Called after each edit. */
  onChange: (value: NodeDefinition) => void;
  /** Returns the id the node really got: a taken id gets a suffix, an empty one is refused. */
  onRename: (id: string) => string;
}

/**
 * The draft of one node, edited by the blueprint's inspector and by the scripting view. Every
 * edit is applied to the pipeline at once, so all the views and the document show the same
 * node; `issue` says why it cannot run yet. The id is applied on `rename()` only.
 */
export const createNodeDraft = ({ node, onChange, onRename }: NodeDraftParams) => {
  let id = $state(node.id);
  let mode = $state<PipelineNodeEntity['kind']>(node.kind);
  let script = $state(node.kind === 'script' ? node.script : '');
  let shell = $state<Shell>(node.kind === 'script' ? node.shell : 'bash');
  let command = $state(node.kind === 'exec' ? node.command : '');
  let args = $state<string[]>(node.kind === 'exec' ? [...node.args] : []);
  let workingDir = $state(node.workingDir ?? '');
  let envRows = $state<EnvRow[]>(node.env.map(toEnvRow));
  let timeoutSeconds = $state(node.timeoutSeconds?.toString() ?? '');
  let retries = $state(String(node.retries ?? 0));
  // The last values in range: a value out of range is shown, never applied.
  let timeout = $state(node.timeoutSeconds);
  let retryCount = $state(node.retries ?? 0);

  const value = $derived.by((): NodeDefinition => {
    // A row with no key is an empty line.
    const env = envRows
      .filter(row => row.key.trim())
      .map(row => toEnvEntry({ ...row, key: row.key.trim() }));
    const base = {
      workingDir: workingDir.trim() || undefined,
      env,
      timeoutSeconds: timeout,
      retries: retryCount || undefined,
    };

    return mode === 'script'
      ? { ...base, kind: 'script', script, shell }
      : // Blank rows are unfilled lines, not empty arguments.
        { ...base, kind: 'exec', command: command.trim(), args: args.filter(arg => arg !== '') };
  });

  const issue = $derived(nodeRunIssue(value));
  // Checked as typed, before the rename applies it: the field says it at once.
  const idIssue = $derived(nodeIdIssue(id));

  const commit = () => onChange(value);

  return {
    get value() {
      return value;
    },
    get issue() {
      return issue;
    },

    get id() {
      return id;
    },
    set id(next: string) {
      id = next;
    },
    get idIssue() {
      return idIssue;
    },
    /** The nearest id the server accepts, while the typed one has an issue. */
    get suggestedId() {
      return idIssue ? toNodeId(id) : null;
    },
    rename() {
      id = onRename(id);
    },

    get mode() {
      return mode;
    },
    set mode(next: PipelineNodeEntity['kind']) {
      mode = next;
      commit();
    },
    get script() {
      return script;
    },
    set script(next: string) {
      script = next;
      commit();
    },
    get shell() {
      return shell;
    },
    set shell(next: Shell) {
      shell = next;
      commit();
    },
    get command() {
      return command;
    },
    set command(next: string) {
      command = next;
      commit();
    },
    get workingDir() {
      return workingDir;
    },
    set workingDir(next: string) {
      workingDir = next;
      commit();
    },
    get timeoutSeconds() {
      return timeoutSeconds;
    },
    set timeoutSeconds(next: string) {
      timeoutSeconds = next;
      const parsed = timeoutOf(next);
      if (parsed === null) return;
      timeout = parsed;
      commit();
    },
    get timeoutInvalid() {
      return timeoutOf(timeoutSeconds) === null;
    },
    get retries() {
      return retries;
    },
    set retries(next: string) {
      retries = next;
      const parsed = retriesOf(next);
      if (parsed === null) return;
      retryCount = parsed;
      commit();
    },
    get retriesInvalid() {
      return retriesOf(retries) === null;
    },

    // An argument is its position: indexed, like its `{#each}` key.
    get args() {
      return args;
    },
    setArg(index: number, next: string) {
      args = args.map((arg, i) => (i === index ? next : arg));
      commit();
    },
    addArg() {
      args = [...args, ''];
    },
    removeArg(index: number) {
      args = args.filter((_, i) => i !== index);
      commit();
    },

    get envRows() {
      return envRows;
    },
    setEnv(index: number, patch: Partial<EnvRow>) {
      envRows = envRows.map((row, i) => (i === index ? { ...row, ...patch } : row));
      commit();
    },
    addEnv() {
      envRows = [...envRows, { key: '', kind: 'literal', value: '', secretRef: '' }];
    },
    removeEnv(index: number) {
      envRows = envRows.filter((_, i) => i !== index);
      commit();
    },
  };
};

export type NodeDraft = ReturnType<typeof createNodeDraft>;
