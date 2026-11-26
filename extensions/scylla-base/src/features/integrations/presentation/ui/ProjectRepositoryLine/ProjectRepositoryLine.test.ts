import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import type { ProjectCardContext } from '@base/features/project';
import ProjectRepositoryLine from './ProjectRepositoryLine.svelte';

let teardown: Array<() => void> = [];

afterEach(() => teardown.forEach(restore => restore()));

const context = (projectId: string): ProjectCardContext => ({
  workspaceId: 'ws-1',
  projectId,
  projectName: projectId,
  batch: [projectId],
  density: 'comfortable',
});

describe('ProjectRepositoryLine', () => {
  it('shows the repository of each card from one read of the links of the workspace', async () => {
    const listByWorkspace = vi.fn().mockResolvedValue([
      { projectId: 'web', provider: 'github', fullName: 'acme/web' },
      { projectId: 'api', provider: 'gitlab', fullName: 'acme/api' },
    ]);
    const cache = withQueryClient();
    teardown = [
      cache.restore,
      withRegistry({ integrations: { repositoryLinkRepository: { listByWorkspace } } }),
    ];

    render(ProjectRepositoryLine, { props: { context: context('web') } });
    render(ProjectRepositoryLine, { props: { context: context('api') } });
    render(ProjectRepositoryLine, { props: { context: context('docs') } });

    expect(await screen.findByText('acme/web')).toBeInTheDocument();
    expect(screen.getByText('acme/api')).toBeInTheDocument();
    expect(document.querySelector('[data-provider-mark="github"]')).not.toBeNull();
    expect(document.querySelectorAll('[data-part="project-repository"]')).toHaveLength(2);
    expect(listByWorkspace).toHaveBeenCalledTimes(1);
    expect(listByWorkspace).toHaveBeenCalledWith('ws-1');
  });
});
