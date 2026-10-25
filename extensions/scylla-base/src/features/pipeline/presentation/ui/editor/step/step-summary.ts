import type { StepDefinition } from '@base/features/pipeline/domain/structs/pipeline.struct.ts';

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

export const envCounts = (definition: StepDefinition) => {
  const secrets = definition.env.filter(entry => entry.kind === 'secret').length;
  return { variables: definition.env.length - secrets, secrets };
};
