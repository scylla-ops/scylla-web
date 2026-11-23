import { i18n } from '@lingui/core';
import type { FragmentVersion } from '@base/features/pipeline';
import type { PackageStack } from '@base/features/marketplace/domain/entities/market-package.entity.ts';

/** The names of the stacks: names of languages and tools, the same in every language. */
export const STACK_NAMES: Record<PackageStack, string> = {
  rust: 'Rust',
  node: 'Node',
  go: 'Go',
  python: 'Python',
  docker: 'Docker',
};

/** `15.2k`: the counts of the marketplace, short. */
export const compactCount = (count: number): string =>
  new Intl.NumberFormat(i18n.locale || 'en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(count);

/** The steps of a version on one line: `install · lint · test`. */
export const stepsLine = (version: Pick<FragmentVersion, 'nodes'>): string =>
  version.nodes.map(node => node.id).join(' · ');

/** The secrets that each pipeline gives the fragment. */
export const secretKeys = (version: Pick<FragmentVersion, 'parameters'>): string[] =>
  version.parameters.filter(parameter => parameter.kind === 'secret').map(parameter => parameter.key);
