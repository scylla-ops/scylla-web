import type { StepTemplateRepository } from '@base/features/pipeline/domain/repository/step-template.repository.ts';
import type { StepTemplate } from '@base/features/pipeline/domain/structs/step-template.struct.ts';
import { ScyllaResult } from '@shared/utils/scylla-result.ts';

export const BUILT_IN_STEP_TEMPLATES: readonly StepTemplate[] = [
  {
    id: 'git-clone',
    name: 'git clone',
    stepId: 'checkout',
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
    stepId: 'install-deps',
    icon: 'package',
    definition: { kind: 'script', shell: 'bash', script: 'npm ci', env: [] },
  },
  {
    id: 'npm-test',
    name: 'npm test',
    stepId: 'run-tests',
    icon: 'test',
    definition: { kind: 'script', shell: 'bash', script: 'npm test', env: [] },
  },
  {
    id: 'docker-build',
    name: 'docker build',
    stepId: 'build-image',
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
    stepId: 'deploy',
    icon: 'deploy',
    definition: { kind: 'script', shell: 'sh', script: './deploy.sh', env: [] },
  },
];

/** Serves the built-in templates. A backend source replaces this class, not its callers. */
export class DefaultStepTemplateRepository implements StepTemplateRepository {
  constructor(private readonly templates: readonly StepTemplate[] = BUILT_IN_STEP_TEMPLATES) {}

  public list(): Promise<ScyllaResult<StepTemplate[]>> {
    return Promise.resolve(ScyllaResult.success([...this.templates]));
  }
}
