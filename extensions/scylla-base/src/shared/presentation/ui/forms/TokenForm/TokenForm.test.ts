import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render } from '@test/render.ts';
import TokenForm from './TokenForm.svelte';

const setup = async (count: number) => {
  render(TokenForm, {
    name: '',
    expiry: 90,
    preset: 'read_only',
    keys: [],
    someProjects: true,
    projectIds: [],
    projects: Array.from({ length: count }, (_, index) => ({
      id: `p-${index}`,
      name: `project-${index}`,
    })),
    hint: '',
  } as never);
  await userEvent.click(screen.getByRole('button', { name: 'Change' }));
};

describe('TokenForm: projects', () => {
  it('has no field for a short list', async () => {
    await setup(7);

    await screen.findByRole('checkbox', { name: 'project-0' });
    expect(screen.queryByRole('textbox', { name: 'Find a project' })).not.toBeInTheDocument();
  });

  it('narrows a long list, and says when no project matches', async () => {
    await setup(8);
    const field = await screen.findByRole('textbox', { name: 'Find a project' });

    await userEvent.type(field, '-7');
    expect(screen.getByRole('checkbox', { name: 'project-7' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'project-0' })).not.toBeInTheDocument();

    await userEvent.type(field, 'zzz');
    expect(screen.getByRole('status')).toHaveTextContent('No project matches this search.');
  });

  it('keeps a checked project that the text hides', async () => {
    await setup(8);
    await userEvent.click(await screen.findByRole('checkbox', { name: 'project-0' }));
    const field = screen.getByRole('textbox', { name: 'Find a project' });

    await userEvent.type(field, '-7');
    await userEvent.clear(field);

    expect(screen.getByRole('checkbox', { name: 'project-0' })).toBeChecked();
  });
});
