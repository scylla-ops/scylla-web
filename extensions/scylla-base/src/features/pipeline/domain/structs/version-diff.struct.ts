import type {
  FragmentParameter,
  FragmentVersion,
} from '@base/features/pipeline/domain/entities/fragment.entity.ts';
import type { PipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';

/** One difference between two versions of a fragment, as the people who use it see it. */
export type VersionChange =
  | { kind: 'node-added'; id: string }
  | { kind: 'node-removed'; id: string }
  | { kind: 'node-changed'; id: string }
  | { kind: 'parameter-added'; parameter: FragmentParameter }
  | { kind: 'parameter-removed'; key: string }
  | { kind: 'default-changed'; key: string; from: string; to: string };

const defaultOf = (parameter: FragmentParameter | undefined): string | undefined =>
  parameter?.kind === 'literal' ? parameter.default : undefined;

/** The code of a node, without its place in the graph. */
const codeOf = ({ id: _id, deps: _deps, ...code }: PipelineNodeEntity) => JSON.stringify(code);

/** What changes for a pipeline that goes from one version to the other: nodes first, then parameters. */
export const versionDiff = (from: FragmentVersion, to: FragmentVersion): VersionChange[] => {
  const before = new Map(from.nodes.map(node => [node.id, node]));
  const after = new Map(to.nodes.map(node => [node.id, node]));
  const parametersBefore = new Map(from.parameters.map(parameter => [parameter.key, parameter]));
  const parametersAfter = new Map(to.parameters.map(parameter => [parameter.key, parameter]));

  const nodes: VersionChange[] = [
    ...to.nodes
      .filter(node => !before.has(node.id))
      .map(node => ({ kind: 'node-added' as const, id: node.id })),
    ...from.nodes
      .filter(node => !after.has(node.id))
      .map(node => ({ kind: 'node-removed' as const, id: node.id })),
    ...to.nodes
      .filter(node => before.has(node.id) && codeOf(before.get(node.id)!) !== codeOf(node))
      .map(node => ({ kind: 'node-changed' as const, id: node.id })),
  ];

  const parameters: VersionChange[] = [
    ...to.parameters
      .filter(parameter => !parametersBefore.has(parameter.key))
      .map(parameter => ({ kind: 'parameter-added' as const, parameter })),
    ...from.parameters
      .filter(parameter => !parametersAfter.has(parameter.key))
      .map(parameter => ({ kind: 'parameter-removed' as const, key: parameter.key })),
    ...to.parameters.flatMap(parameter => {
      const previous = defaultOf(parametersBefore.get(parameter.key));
      const next = defaultOf(parameter);
      return previous !== undefined && next !== undefined && previous !== next
        ? [{ kind: 'default-changed' as const, key: parameter.key, from: previous, to: next }]
        : [];
    }),
  ];

  return [...nodes, ...parameters];
};
