import { describe, it, expect, vi, afterEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import ProjectChooser from './ProjectChooser.svelte';

let teardown: Array<() => void> = [];

const setup = (count: number) => {
  const cache = withQueryClient();
  const restore = withRegistry({
    project: {
      projectRepository: {
        getByWorkspaceId: vi.fn().mockResolvedValue({
          items: Array.from({ length: count }, (_, index) => ({
            id: `p-${index}`,
            name: `project-${index}`,
          })),
        }),
      },
    },
  });
  teardown = [cache.restore, restore];
  render(ProjectChooser, { workspaceId: 'w-1', someProjects: true, projectIds: [] });
};

afterEach(() => teardown.forEach(restore => restore()));

describe('ProjectChooser', () => {
  it('has no field for a short list', async () => {
    setup(7);

    await screen.findByRole('checkbox', { name: 'project-0' });
    expect(screen.queryByRole('textbox', { name: 'Find a project' })).not.toBeInTheDocument();
  });

  it('narrows a long list', async () => {
    setup(8);

    await userEvent.type(await screen.findByRole('textbox', { name: 'Find a project' }), '-7');

    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    expect(screen.getByRole('checkbox', { name: 'project-7' })).toBeInTheDocument();
  });

  it('keeps a checked project that the text hides', async () => {
    setup(8);
    await userEvent.click(await screen.findByRole('checkbox', { name: 'project-0' }));
    const field = screen.getByRole('textbox', { name: 'Find a project' });

    await userEvent.type(field, '-7');
    expect(screen.queryByRole('checkbox', { name: 'project-0' })).not.toBeInTheDocument();
    await userEvent.clear(field);

    expect(screen.getByRole('checkbox', { name: 'project-0' })).toBeChecked();
  });

  it('cancels Enter in the field, because a form can hold it', async () => {
    setup(8);
    const field = await screen.findByRole('textbox', { name: 'Find a project' });

    const notCancelled = await fireEvent.keyDown(field, { key: 'Enter' });

    expect(notCancelled).toBe(false);
  });

  it('says when no project matches', async () => {
    setup(8);

    await userEvent.type(await screen.findByRole('textbox', { name: 'Find a project' }), 'zzz');

    expect(screen.getByRole('status')).toHaveTextContent('No project matches this search.');
  });
});
