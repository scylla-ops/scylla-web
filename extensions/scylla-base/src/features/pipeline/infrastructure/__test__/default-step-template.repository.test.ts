// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { StepTemplate } from '@base/features/pipeline/domain/structs/step-template.struct.ts';
import {
  BUILT_IN_STEP_TEMPLATES,
  DefaultStepTemplateRepository,
} from '../default-step-template.repository.ts';

describe('DefaultStepTemplateRepository', () => {
  it('serves the built-in templates by default', async () => {
    const result = await new DefaultStepTemplateRepository().list();
    expect(result.unwrap()).toEqual(BUILT_IN_STEP_TEMPLATES);
  });

  it('gives a copy, so a caller cannot change the source list', async () => {
    const templates: StepTemplate[] = [
      {
        id: 'make',
        name: 'make',
        stepId: 'build',
        definition: { kind: 'exec', command: 'make', args: [], env: [] },
      },
    ];
    const listed = (await new DefaultStepTemplateRepository(templates).list()).unwrap();
    listed.pop();

    expect(templates).toHaveLength(1);
  });

  it('only offers templates that can run as they are', () => {
    for (const template of BUILT_IN_STEP_TEMPLATES) {
      const { definition } = template;
      const body = definition.kind === 'exec' ? definition.command : definition.script;
      expect(body.trim(), template.id).not.toBe('');
    }
  });
});
