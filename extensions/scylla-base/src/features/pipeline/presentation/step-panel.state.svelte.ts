import type { EnvEntry, PipelineStep, Shell } from '../domain/structs/pipeline.struct.ts';
import type { NodeFormValue } from './utils/blueprint-converter.ts';

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

/** What the panel sends after each edit: the step as it now reads, under its committed id. */
export interface StepChange {
  nodeId: string;
  value: NodeFormValue;
}

/**
 * The fields of the step panel, seeded once from the step: the panel is rebuilt
 * for another step. Each edit calls `onChange` at once. The id is only sent by
 * `commitId`, or a rename would go through every prefix of the new name.
 */
export const createStepPanelState = (
  step: PipelineStep,
  onChange: (change: StepChange) => void,
) => {
  let nodeId = $state(step.id);
  let mode = $state<'script' | 'exec'>(step.kind);
  let script = $state(step.kind === 'script' ? step.script : '');
  let shell = $state<Shell>(step.kind === 'script' ? step.shell : 'sh');
  let command = $state(step.kind === 'exec' ? step.command : '');
  let args = $state<string[]>(step.kind === 'exec' ? [...step.args] : []);
  let workingDir = $state(step.workingDir ?? '');
  let envRows = $state<EnvRow[]>(step.env.map(rowFrom));
  let committedId = step.id;

  const valueOf = (): NodeFormValue => {
    // A row with no key is an empty line.
    const env = envRows
      .filter(row => row.key.trim())
      .map(row => entryFrom({ ...row, key: row.key.trim() }));
    const directory = workingDir.trim() || undefined;

    if (mode === 'script') return { kind: 'script', script, shell, workingDir: directory, env };
    return {
      kind: 'exec',
      command: command.trim(),
      // Blank rows are unfilled lines, not empty arguments.
      args: args.filter(arg => arg !== ''),
      workingDir: directory,
      env,
    };
  };

  const notify = () => onChange({ nodeId: committedId, value: valueOf() });

  return {
    get nodeId() {
      return nodeId;
    },
    set nodeId(next: string) {
      nodeId = next;
    },
    get mode() {
      return mode;
    },
    set mode(next: 'script' | 'exec') {
      mode = next;
      notify();
    },
    get script() {
      return script;
    },
    set script(next: string) {
      script = next;
      notify();
    },
    get shell() {
      return shell;
    },
    set shell(next: Shell) {
      shell = next;
      notify();
    },
    get command() {
      return command;
    },
    set command(next: string) {
      command = next;
      notify();
    },
    get workingDir() {
      return workingDir;
    },
    set workingDir(next: string) {
      workingDir = next;
      notify();
    },

    // An argument is its position: indexed, like its `{#each}` key.
    get args() {
      return args;
    },
    setArg: (index: number, value: string) => {
      args = args.map((arg, i) => (i === index ? value : arg));
      notify();
    },
    addArg: () => {
      args = [...args, ''];
    },
    removeArg: (index: number) => {
      args = args.filter((_, i) => i !== index);
      notify();
    },

    get envRows() {
      return envRows;
    },
    setEnv: (index: number, patch: Partial<EnvRow>) => {
      envRows = envRows.map((row, i) => (i === index ? { ...row, ...patch } : row));
      notify();
    },
    addEnv: () => {
      envRows = [...envRows, { key: '', kind: 'literal', value: '', secretRef: '' }];
    },
    removeEnv: (index: number) => {
      envRows = envRows.filter((_, i) => i !== index);
      notify();
    },

    /** Sends the typed id. A blank id is not sent: the step keeps its name. */
    commitId() {
      if (!nodeId.trim()) return;
      committedId = nodeId.trim();
      notify();
    },
  };
};

export type StepPanelState = ReturnType<typeof createStepPanelState>;
