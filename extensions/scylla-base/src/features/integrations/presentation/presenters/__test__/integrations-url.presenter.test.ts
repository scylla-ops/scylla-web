// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  connectionIdIn,
  newGitHubProjectUrl,
  repositorySettingsUrl,
  withConnection,
} from '../integrations-url.presenter.ts';

describe('integrations URLs', () => {
  it('gives back the page that started a GitHub install, with the new connection', () => {
    const page = newGitHubProjectUrl('acme');

    expect(page).toBe('/acme/projects/new/github');
    expect(withConnection(page, 'c 9')).toBe('/acme/projects/new/github?connection=c+9');
    expect(withConnection('/acme/x?tab=a&connection=old', 'c-9')).toBe(
      '/acme/x?tab=a&connection=c-9',
    );
    expect(connectionIdIn('?connection=c+9')).toBe('c 9');
    expect(connectionIdIn('')).toBe('');
  });

  it('opens the repository settings of a project', () => {
    expect(repositorySettingsUrl('acme', 'p-1')).toBe('/acme/projects/p-1/settings/repository');
  });
});
