import type { NodeTemplateRepository } from '@base/features/pipeline/domain/repository/node-template.repository.ts';
import type { NodeTemplateEntity } from '@base/features/pipeline/domain/entities/node-template.entity.ts';
import { ScyllaResult } from '@shared/utils/scylla-result.ts';

export const BUILT_IN_NODE_TEMPLATES: readonly NodeTemplateEntity[] = [
  {
    id: 'git-clone',
    name: 'git clone',
    nodeId: 'checkout',
    icon: 'git',
    definition: {
      kind: 'script',
      shell: 'sh',
      script: 'git clone --depth 1 "$REPO_URL" .',
      env: [{ key: 'REPO_URL', kind: 'literal', value: '' }],
    },
  },
  {
    id: 'npm-ci',
    name: 'npm ci',
    nodeId: 'install-deps',
    icon: 'package',
    definition: { kind: 'script', shell: 'bash', script: 'npm ci', env: [] },
  },
  {
    id: 'npm-test',
    name: 'npm test',
    nodeId: 'run-tests',
    icon: 'test',
    definition: { kind: 'script', shell: 'bash', script: 'npm test', env: [] },
  },
  {
    id: 'docker-build',
    name: 'docker build',
    nodeId: 'build-image',
    icon: 'container',
    definition: {
      kind: 'exec',
      command: 'docker',
      args: ['build', '-t', 'app:latest', '.'],
      env: [],
    },
  },
  {
    id: 'deploy-script',
    name: 'deploy.sh',
    nodeId: 'deploy',
    icon: 'deploy',
    definition: { kind: 'script', shell: 'sh', script: './deploy.sh', env: [] },
  },
];

/** Serves the built-in templates. A backend source replaces this class, not its callers. */
export class DefaultNodeTemplateRepository implements NodeTemplateRepository {
  constructor(
    private readonly templates: readonly NodeTemplateEntity[] = BUILT_IN_NODE_TEMPLATES,
  ) {}

  public list(): Promise<ScyllaResult<NodeTemplateEntity[]>> {
    return Promise.resolve(ScyllaResult.success([...this.templates]));
  }
}
