import { describe, expect, it } from 'vitest';
import { searchResults, type SearchSources } from './search-results.presenter.ts';

const sources: SearchSources = {
  projects: [{ id: 'p1', name: 'Website' }],
  pipelines: [{ id: 'l1', name: 'Build web', projectId: 'p1' }],
  apps: [
    { id: 'a1', name: 'web-runner', runner: true },
    { id: 'a2', name: 'Release bot', runner: false },
  ],
};

describe('searchResults', () => {
  it('finds nothing with no text', () => {
    expect(searchResults(sources, '   ')).toEqual([]);
  });

  it('searches each kind, with no care for the case', () => {
    expect(searchResults(sources, 'WEB').map(result => result.kind)).toEqual([
      'project',
      'agent',
      'pipeline',
    ]);
  });

  it('puts a name that starts with the text before a name that holds it', () => {
    expect(searchResults(sources, 'web').map(result => result.name)).toEqual([
      'Website',
      'web-runner',
      'Build web',
    ]);
  });

  it('gives the path of the page of each kind', () => {
    const paths = Object.fromEntries(
      searchResults(sources, 'e').map(result => [result.id, result.path]),
    );

    expect(paths).toEqual({
      p1: 'projects/p1',
      l1: 'projects/p1/pipelines/l1/jobs',
      a1: 'agents/a1',
      a2: 'apps/a2',
    });
  });

  it('gives at most 8 results', () => {
    const projects = Array.from({ length: 20 }, (_, index) => ({
      id: String(index),
      name: `web ${index}`,
    }));

    expect(searchResults({ projects, pipelines: [], apps: [] }, 'web')).toHaveLength(8);
  });
});
