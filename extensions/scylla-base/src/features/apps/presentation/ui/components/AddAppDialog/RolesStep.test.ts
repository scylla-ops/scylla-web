import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import RolesStep from './RolesStep.svelte';

let teardown: Array<() => void> = [];

const setup = async (count: number) => {
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
  render(RolesStep, {
    workspaceId: 'w-1',
    workspaceName: 'Acme',
    name: '',
    workspaceRole: '',
    projectRoles: {},
  });
  await userEvent.click(screen.getByRole('button', { name: 'Add project roles' }));
};

afterEach(() => teardown.forEach(restore => restore()));

describe('RolesStep', () => {
  it('has no field for a short list', async () => {
    await setup(7);

    await screen.findByRole('combobox', { name: 'project-0' });
    expect(screen.queryByRole('textbox', { name: 'Find a project' })).not.toBeInTheDocument();
  });

  it('narrows a long list, and says when no project matches', async () => {
    await setup(8);
    const field = await screen.findByRole('textbox', { name: 'Find a project' });

    await userEvent.type(field, '-7');
    expect(screen.getByRole('combobox', { name: 'project-7' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'project-0' })).not.toBeInTheDocument();

    await userEvent.type(field, 'zzz');
    expect(screen.getByRole('status')).toHaveTextContent('No project matches this search.');
  });

  it('keeps the role of a project that the text hides', async () => {
    await setup(8);
    const field = await screen.findByRole('textbox', { name: 'Find a project' });

    await userEvent.type(field, 'zzz');
    await userEvent.clear(field);

    expect(screen.getByRole('combobox', { name: 'project-0' })).toBeInTheDocument();
  });
});
