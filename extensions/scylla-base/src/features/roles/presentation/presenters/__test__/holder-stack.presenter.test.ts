// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { RoleHolderEntry } from '../../../domain/entities/role.entity.ts';
import { holderStack } from '../holder-stack.presenter.ts';

const grant = (actorId: string, scopeId = 'w-1'): RoleHolderEntry => ({
  actorId,
  actorKind: 'user',
  displayName: actorId,
  handle: actorId,
  runner: false,
  scopeKind: 'workspace',
  scopeId,
  scopeName: scopeId,
});

const ids = (holders: RoleHolderEntry[]) => holders.map(holder => holder.actorId);

describe('holderStack', () => {
  it('keeps the first three actors and counts the others', () => {
    const holders = ['a', 'b', 'c', 'd', 'e'].map(id => grant(id));

    const stack = holderStack({ holders, total: 5 });

    expect(ids(stack.shown)).toEqual(['a', 'b', 'c']);
    expect(stack.more).toBe(2);
  });

  it('shows an actor once, also when it holds the role on two projects', () => {
    const holders = [grant('a', 'p-1'), grant('a', 'p-2'), grant('b')];

    const stack = holderStack({ holders, total: 3 });

    expect(ids(stack.shown)).toEqual(['a', 'b']);
    expect(stack.more).toBe(0);
  });

  it('counts the grants that the server did not send', () => {
    const holders = ['a', 'b', 'c'].map(id => grant(id));

    expect(holderStack({ holders, total: 120 }).more).toBe(117);
  });
});
