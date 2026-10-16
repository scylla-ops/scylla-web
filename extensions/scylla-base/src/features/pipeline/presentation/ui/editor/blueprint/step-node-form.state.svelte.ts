import type { EnvEntry, PipelineStep, Shell } from '../../../../domain/structs/pipeline.struct.ts';
import type { NodeFormValue } from '../../../utils/blueprint-converter.ts';

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

export interface StepNodeFormOptions {
  /**
   * Called after each edit, with the step as it now reads. The id is only
   * sent by `commitId`: renaming at each keystroke would rename the step
   * through every prefix of the new name.
   */
  onChange?: (change: { nodeId: string; value: NodeFormValue }) => void;
}

/** Seeded once: the panel rebuilds it for each step. */
export const createStepNodeForm = (
  editingStep?: PipelineStep,
  { onChange }: StepNodeFormOptions = {},
) => {
  let nodeId = $state(editingStep?.id ?? '');
  let mode = $state<'script' | 'exec'>(editingStep?.kind === 'exec' ? 'exec' : 'script');
  let script = $state(editingStep?.kind === 'script' ? editingStep.script : '');
  let shell = $state<Shell>(editingStep?.kind === 'script' ? editingStep.shell : 'sh');
  let command = $state(editingStep?.kind === 'exec' ? editingStep.command : '');
  let args = $state<string[]>(editingStep?.kind === 'exec' ? [...editingStep.args] : []);
  let workingDir = $state(editingStep?.workingDir ?? '');
  let envRows = $state<EnvRow[]>(editingStep ? editingStep.env.map(rowFrom) : []);
  let committedId = editingStep?.id ?? '';
  let lastSent = '';

  const toValue = (id: string): { nodeId: string; value: NodeFormValue } | null => {
    const trimmedId = id.trim();
    if (!trimmedId) return null;

    // A row with no key is an empty line.
    const env = envRows
      .filter(row => row.key.trim())
      .map(row => entryFrom({ ...row, key: row.key.trim() }));
    const directory = workingDir.trim() ? workingDir.trim() : undefined;

    if (mode === 'script') {
      return {
        nodeId: trimmedId,
        value: { kind: 'script', script, shell, workingDir: directory, env },
      };
    }
    return {
      nodeId: trimmedId,
      value: {
        kind: 'exec',
        command: command.trim(),
        // Blank rows are unfilled lines, not empty arguments.
        args: args.filter(arg => arg !== ''),
        workingDir: directory,
        env,
      },
    };
  };

  const notify = () => {
    const next = toValue(committedId);
    if (!next) return;
    const key = JSON.stringify(next);
    if (key === lastSent) return;
    lastSent = key;
    onChange?.(next);
  };

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

    /** The step as it reads, with the typed id; `null` without an id. */
    toValue: () => toValue(nodeId),
  };
};

export type StepNodeForm = ReturnType<typeof createStepNodeForm>;
