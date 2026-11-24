import type {
  FragmentParameter,
  FragmentUsage,
  FragmentVersion,
} from '@base/features/pipeline/domain/entities/fragment.entity.ts';
import type { ExecPipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';

export const execNode = (id: string, ...args: string[]): ExecPipelineNodeEntity => ({
  id,
  deps: [],
  kind: 'exec',
  command: 'pnpm',
  args: args.length ? args : [id],
  env: [],
});

export const literal = (
  key: string,
  value: string,
  description = 'Documented.',
): FragmentParameter => ({
  key,
  kind: 'literal',
  default: value,
  description,
});

export const version = (
  number: number,
  overrides: Partial<FragmentVersion> = {},
): FragmentVersion => ({
  number,
  nodes: [execNode('install'), execNode('test')],
  parameters: [literal('NODE_VERSION', '20')],
  changes: [],
  author: { id: 'pnpm', name: 'pnpm' },
  publishedAt: '2026-10-01T10:00:00Z',
  ...overrides,
});

export const usage = (
  pipelineName: string,
  values: Record<string, string> = {},
): FragmentUsage => ({
  pipelineId: pipelineName,
  pipelineName,
  projectId: 'store',
  projectName: 'store',
  version: 8,
  values,
});

export const PACKAGE = {
  packageId: 'pnpm.node-ci',
  publisher: 'pnpm',
  name: 'node-ci',
  verified: true,
};
