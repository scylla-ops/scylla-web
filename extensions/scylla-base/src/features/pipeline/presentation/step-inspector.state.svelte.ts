import type {
  EnvEntry,
  PipelineStep,
  Shell,
  StepDefinition,
} from '../domain/structs/pipeline.struct.ts';
import { stepIssue } from './utils/step-summary.ts';

/** Keeps both a literal and a secret reference, so switching the kind loses nothing typed. */
export interface EnvRow {
  key: string;
  kind: 'literal' | 'secret';
  value: string;
  secretRef: string;
}

const rowFrom = (entry: EnvEntry): EnvRow =>
  entry.kind === 'secret'
    ? { key: entry.key, kind: 'secret', value: '', secretRef: entry.secretRef }
    : { key: entry.key, kind: 'literal', value: entry.value, secretRef: '' };

const entryFrom = (row: EnvRow): EnvEntry =>
  row.kind === 'secret'
    ? { key: row.key, kind: 'secret', secretRef: row.secretRef }
    : { key: row.key, kind: 'literal', value: row.value };

export interface StepInspectorParams {
  /** Read once: the inspector is rebuilt for each step it opens on. */
  step: PipelineStep;
  /** Called after each edit. */
  onChange: (value: StepDefinition) => void;
  /** Returns the id the step really got: a taken id gets a suffix, an empty one is refused. */
  onRename: (id: string) => string;
}

/**
 * The draft of the selected step. Every edit is applied to the pipeline at once, so the
 * inspector, the node and the document always show the same step; `issue` says why it
 * cannot run yet. The id is applied on `rename()` only: a new id rebuilds the inspector.
 */
export const createStepInspector = ({ step, onChange, onRename }: StepInspectorParams) => {
  let id = $state(step.id);
  let mode = $state<PipelineStep['kind']>(step.kind);
  let script = $state(step.kind === 'script' ? step.script : '');
  let shell = $state<Shell>(step.kind === 'script' ? step.shell : 'bash');
  let command = $state(step.kind === 'exec' ? step.command : '');
  let args = $state<string[]>(step.kind === 'exec' ? [...step.args] : []);
  let workingDir = $state(step.workingDir ?? '');
  let envRows = $state<EnvRow[]>(step.env.map(rowFrom));

  const value = $derived.by((): StepDefinition => {
    // A row with no key is an empty line.
    const env = envRows
      .filter(row => row.key.trim())
      .map(row => entryFrom({ ...row, key: row.key.trim() }));
    const base = { workingDir: workingDir.trim() || undefined, env };

    return mode === 'script'
      ? { ...base, kind: 'script', script, shell }
      : // Blank rows are unfilled lines, not empty arguments.
        { ...base, kind: 'exec', command: command.trim(), args: args.filter(arg => arg !== '') };
  });

  const issue = $derived(stepIssue(value));

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
    rename() {
      id = onRename(id);
    },

    get mode() {
      return mode;
    },
    set mode(next: PipelineStep['kind']) {
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

export type StepInspector = ReturnType<typeof createStepInspector>;
