// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { NodeTemplateEntity } from '@base/features/pipeline/domain/entities/node-template.entity.ts';
import {
  BUILT_IN_NODE_TEMPLATES,
  DefaultNodeTemplateRepository,
} from '../default-node-template.repository.ts';

describe('DefaultNodeTemplateRepository', () => {
  it('serves the built-in templates by default', async () => {
    const result = await new DefaultNodeTemplateRepository().list();
    expect(result).toEqual(BUILT_IN_NODE_TEMPLATES);
  });

  it('gives a copy, so a caller cannot change the source list', async () => {
    const templates: NodeTemplateEntity[] = [
      {
        id: 'make',
        name: 'make',
        nodeId: 'build',
        definition: { kind: 'exec', command: 'make', args: [], env: [] },
      },
    ];
    const listed = await new DefaultNodeTemplateRepository(templates).list();
    listed.pop();

    expect(templates).toHaveLength(1);
  });

  it('only offers templates that can run as they are', () => {
    for (const template of BUILT_IN_NODE_TEMPLATES) {
      const { definition } = template;
      const body = definition.kind === 'exec' ? definition.command : definition.script;
      expect(body.trim(), template.id).not.toBe('');
    }
  });
});
