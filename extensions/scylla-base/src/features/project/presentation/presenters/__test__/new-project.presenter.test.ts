// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  newProjectGroupIn,
  newProjectPath,
  withNewProjectGroup,
} from '../new-project.presenter.ts';

describe('the URL of a new project in a group', () => {
  it('puts the group in the query, and no query for no group', () => {
    expect(newProjectPath('g-1')).toBe('projects/new?group=g-1');
    expect(newProjectPath()).toBe('projects/new');
    expect(withNewProjectGroup('/acme/projects/new/regular', 'a b')).toBe(
      '/acme/projects/new/regular?group=a%20b',
    );
  });

  it('reads the group back from the query, and nothing from an empty value', () => {
    expect(newProjectGroupIn('?group=g-1')).toBe('g-1');
    expect(newProjectGroupIn('?group=a%20b&x=1')).toBe('a b');
    expect(newProjectGroupIn('?group=')).toBeUndefined();
    expect(newProjectGroupIn('')).toBeUndefined();
  });
});
