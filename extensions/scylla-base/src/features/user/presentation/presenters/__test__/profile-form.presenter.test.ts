// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { UserEntity } from '@base/features/user/domain/entities/user.entity.ts';
import { profileChanges } from '../profile-form.presenter.ts';

const ada: UserEntity = {
  id: 'user-1',
  username: 'ada',
  email: 'ada@example.com',
  displayName: 'Ada',
  isActive: true,
  updatedAt: '2025-01-01T00:00:00.000Z',
};

const same = { username: 'ada', displayName: 'Ada', email: 'ada@example.com' };

describe('profileChanges', () => {
  it('is null when nothing changed', () => {
    expect(profileChanges(ada, same, true)).toBeNull();
  });

  it('ignores the spaces around a value', () => {
    expect(profileChanges(ada, { ...same, username: ' ada ' }, true)).toBeNull();
  });

  it('holds only the fields that changed', () => {
    expect(profileChanges(ada, { ...same, displayName: 'Ada Lovelace' }, true)).toEqual({
      id: 'user-1',
      displayName: 'Ada Lovelace',
    });
  });

  it('sends an empty display name to remove it', () => {
    expect(profileChanges(ada, { ...same, displayName: '' }, false)).toEqual({
      id: 'user-1',
      displayName: '',
    });
  });

  it('adds a display name to a user that had none', () => {
    const { displayName: _displayName, ...withoutName } = ada;

    expect(profileChanges(withoutName, { ...same, displayName: 'Ada' }, false)).toEqual({
      id: 'user-1',
      displayName: 'Ada',
    });
  });

  it('never sends the email when the viewer may not change it', () => {
    expect(profileChanges(ada, { ...same, email: 'new@example.com' }, false)).toBeNull();
  });

  it('sends a changed email when the viewer may change it', () => {
    expect(profileChanges(ada, { ...same, email: 'new@example.com' }, true)).toEqual({
      id: 'user-1',
      email: 'new@example.com',
    });
  });
});
