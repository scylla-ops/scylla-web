import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { focusSettled, render, withQueryClient, withRegistry } from '@test/render.ts';
import { installTestNavigator } from '@test/navigator.ts';
import { contextStore } from '@platform/context';
import type { OrganizationRepository } from '@base/features/organization/domain/repository/organization.repository.ts';
import AddOrganizationDialog from './AddOrganizationDialog.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn() } }));

let teardown: Array<() => void> = [];
let testNavigator: ReturnType<typeof installTestNavigator>;
let create: ReturnType<typeof vi.fn>;

const setUp = (props: { setOpen?: (open: boolean) => void; hideCancel?: boolean } = {}) => {
  create = vi.fn().mockResolvedValue({ id: 'org-1', name: 'Acme Corp', slug: 'acme-corp' });
  const repository = { create } as unknown as OrganizationRepository;

  const cache = withQueryClient();
  const restoreRegistry = withRegistry({ organization: { organizationRepository: repository } });
  testNavigator = installTestNavigator();
  teardown = [cache.restore, restoreRegistry, testNavigator.restore];

  return render(AddOrganizationDialog, {
    open: true,
    setOpen: props.setOpen ?? vi.fn(),
    hideCancel: props.hideCancel,
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  contextStore.setState({ organization: { id: null, name: null, slug: null } });
});

afterEach(() => teardown.forEach(restore => restore()));

describe('AddOrganizationDialog', () => {
  it('enables Create once a name is entered: the address is optional', async () => {
    const user = userEvent.setup();
    setUp();
    await focusSettled();

    const button = screen.getByRole('button', { name: 'Create Workspace' });
    expect(button).toBeDisabled();

    await user.type(screen.getByLabelText('Workspace name'), 'Acme Corp');
    expect(button).toBeEnabled();
  });

  it('creates a workspace without an address', async () => {
    const user = userEvent.setup();
    setUp();
    await focusSettled();

    await user.type(screen.getByLabelText('Workspace name'), 'Acme Corp');
    await user.click(screen.getByRole('button', { name: 'Create Workspace' }));

    await waitFor(() => expect(create).toHaveBeenCalledWith('Acme Corp', undefined));
  });

  it('submits the trimmed name, then closes and navigates to its slug on success', async () => {
    const setOpen = vi.fn();
    const user = userEvent.setup();
    setUp({ setOpen });
    await focusSettled();

    await user.type(screen.getByLabelText('Workspace name'), '  Acme Corp  ');
    await user.type(screen.getByLabelText('Address'), 'a real one');
    await user.click(screen.getByRole('button', { name: 'Create Workspace' }));

    await waitFor(() => expect(create).toHaveBeenCalledWith('Acme Corp', 'a real one'));
    await waitFor(() => expect(setOpen).toHaveBeenCalledWith(false));
    expect(contextStore.getState().organization).toEqual({ id: 'org-1', name: 'Acme Corp', slug: 'acme-corp' });
    expect(testNavigator.navigate).toHaveBeenCalledWith('/acme-corp/projects', undefined);
  });

  it('sends a trimmed, non-empty address', async () => {
    const user = userEvent.setup();
    setUp();
    await focusSettled();

    await user.type(screen.getByLabelText('Workspace name'), 'Acme');
    await user.type(screen.getByLabelText('Address'), '  a real one  ');
    await user.click(screen.getByRole('button', { name: 'Create Workspace' }));

    await waitFor(() => expect(create).toHaveBeenCalledWith('Acme', 'a real one'));
  });

  it('hides the Cancel button when hideCancel is set', async () => {
    setUp({ hideCancel: true });
    await focusSettled();

    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });
});
