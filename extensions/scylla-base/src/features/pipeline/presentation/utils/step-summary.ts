import type { StepDefinition } from '@base/features/pipeline/domain/structs/pipeline.struct.ts';

/** What stops a step from running. The node and the inspector both show it. */
export type StepIssue = 'missing-command' | 'empty-script';

/** A shebang, a comment or a `set -e` says nothing about what the step does. */
const isNoise = (line: string) => line.startsWith('#') || /^set\s/.test(line);

/** One line that tells what the step runs: the command, or the first meaningful script line. */
export const stepPreview = (definition: StepDefinition): string => {
  if (definition.kind === 'exec') return [definition.command, ...definition.args].join(' ').trim();

  return (
    definition.script
      .split('\n')
      .map(line => line.trim())
      .find(line => line !== '' && !isNoise(line)) ?? ''
  );
};

export const stepIssue = (definition: StepDefinition): StepIssue | null => {
  if (definition.kind === 'exec') return definition.command.trim() ? null : 'missing-command';
  return definition.script.trim() ? null : 'empty-script';
};

export const envCounts = (definition: StepDefinition) => {
  const secrets = definition.env.filter(entry => entry.kind === 'secret').length;
  return { variables: definition.env.length - secrets, secrets };
};
