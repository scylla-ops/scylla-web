export type SearchResultKind = 'project' | 'pipeline' | 'agent' | 'app';

export interface SearchResult {
  id: string;
  kind: SearchResultKind;
  name: string;
  /** Relative to the workspace. */
  path: string;
}

export interface SearchSources {
  projects: readonly { id: string; name: string }[];
  pipelines: readonly { id: string; name: string; projectId: string }[];
  apps: readonly { id: string; name: string; runner: boolean }[];
}

const LIMIT = 8;

/** What matches the text, the best first: a name that starts with the text comes first. */
export const searchResults = (sources: SearchSources, text: string): SearchResult[] => {
  const needle = text.trim().toLowerCase();
  if (!needle) return [];

  const all: SearchResult[] = [
    ...sources.projects.map(({ id, name }) => ({
      id,
      kind: 'project' as const,
      name,
      path: `projects/${id}`,
    })),
    ...sources.pipelines.map(({ id, name, projectId }) => ({
      id,
      kind: 'pipeline' as const,
      name,
      path: `projects/${projectId}/pipelines/${id}/jobs`,
    })),
    ...sources.apps.map(({ id, name, runner }) => ({
      id,
      kind: runner ? ('agent' as const) : ('app' as const),
      name,
      path: `${runner ? 'agents' : 'apps'}/${id}`,
    })),
  ];

  const position = (result: SearchResult) => result.name.toLowerCase().indexOf(needle);

  return all
    .filter(result => position(result) >= 0)
    .sort((a, b) => Number(position(b) === 0) - Number(position(a) === 0))
    .slice(0, LIMIT);
};
