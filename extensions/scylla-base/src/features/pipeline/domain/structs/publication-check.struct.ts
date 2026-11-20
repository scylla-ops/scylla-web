import type { FragmentVersion } from '@base/features/pipeline/domain/entities/fragment.entity.ts';

/**
 * What the workspace checks before a version goes public. An `error` stops the publication; a
 * `warning` is for the publisher to judge.
 */
export type PublicationCheck =
  | { kind: 'secret-defaults'; passed: boolean; keys: string[]; severity: 'error' }
  | { kind: 'documented'; passed: boolean; keys: string[]; severity: 'warning' }
  | { kind: 'private-defaults'; passed: boolean; keys: string[]; severity: 'warning' }
  | { kind: 'workspace-references'; passed: boolean; nodes: string[]; severity: 'error' };

/** A name that tells a secret: such a parameter must not have a default value. */
const SECRET_NAME = /TOKEN|SECRET|PASSWORD|PASSWD|PRIVATE_KEY|API_KEY|CREDENTIAL/i;

/** An address that other organizations cannot reach. */
const PRIVATE_ADDRESS =
  /\blocalhost\b|\.internal\b|\.local\b|\.corp\b|\b10\.\d+\.\d+\.\d+|\b192\.168\./i;

const codeOf = (node: FragmentVersion['nodes'][number]): string =>
  node.kind === 'script' ? node.script : [node.command, ...node.args].join(' ');

/** `scope`: the slug of the workspace. A default or a node that names it is private to it. */
export const publicationChecks = (version: FragmentVersion, scope: string): PublicationCheck[] => {
  const literals = version.parameters.flatMap(parameter =>
    parameter.kind === 'literal' && parameter.default.trim() ? [parameter] : [],
  );
  const mentionsScope = (text: string) =>
    !!scope && text.toLowerCase().includes(scope.toLowerCase());

  const secretDefaults = literals
    .filter(parameter => SECRET_NAME.test(parameter.key))
    .map(p => p.key);
  const undocumented = version.parameters
    .filter(parameter => !parameter.description?.trim())
    .map(parameter => parameter.key);
  const privateDefaults = literals
    .filter(
      parameter => PRIVATE_ADDRESS.test(parameter.default) || mentionsScope(parameter.default),
    )
    .map(parameter => parameter.key);
  const referencing = version.nodes
    .filter(node => mentionsScope(codeOf(node)))
    .map(node => node.id);

  return [
    {
      kind: 'secret-defaults',
      passed: !secretDefaults.length,
      keys: secretDefaults,
      severity: 'error',
    },
    { kind: 'documented', passed: !undocumented.length, keys: undocumented, severity: 'warning' },
    {
      kind: 'private-defaults',
      passed: !privateDefaults.length,
      keys: privateDefaults,
      severity: 'warning',
    },
    {
      kind: 'workspace-references',
      passed: !referencing.length,
      nodes: referencing,
      severity: 'error',
    },
  ];
};

/** A failed error check stops the publication. */
export const canGoPublic = (checks: readonly PublicationCheck[]): boolean =>
  checks.every(check => check.passed || check.severity === 'warning');
