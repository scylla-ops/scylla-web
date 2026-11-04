// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createWorkspaceItems } from '@base/features/workspace/presentation/presenters/workspace-form.presenter.ts';
import { FormItemType } from '@scylla/ui';

describe('createWorkspaceItems', () => {
  it('declares a name and a slug field, neither pattern-constrained', () => {
    const items = createWorkspaceItems();
    expect(items.map(i => i.id)).toEqual(['name', 'slug']);
    expect(
      items.every(i => i.type === FormItemType.Input && i.pattern === undefined),
    ).toBe(true);
  });
});
