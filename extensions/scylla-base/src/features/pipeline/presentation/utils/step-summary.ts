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

/** The server's rule (`NodeIdRule` in scylla-domain): trimmed, 1 to 128 of `a-z`, `0-9`, `-`, `_`. */
export const NODE_ID_MAX_LENGTH = 128;

export type NodeIdIssue =
  | { kind: 'empty' }
  | { kind: 'invalid-characters'; characters: string[] }
  | { kind: 'too-long'; length: number };

export const nodeIdIssue = (raw: string): NodeIdIssue | null => {
  const id = raw.trim();
  if (!id) return { kind: 'empty' };

  const characters = [...new Set([...id].filter(character => !/[a-z0-9_-]/.test(character)))];
  if (characters.length) return { kind: 'invalid-characters', characters };

  // Only ASCII is left: a character is a byte.
  return id.length > NODE_ID_MAX_LENGTH ? { kind: 'too-long', length: id.length } : null;
};

/** The nearest valid id: lowercase, accents dropped, any other run of characters a `-`. */
export const toNodeId = (raw: string): string =>
  raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, NODE_ID_MAX_LENGTH) || 'step';
