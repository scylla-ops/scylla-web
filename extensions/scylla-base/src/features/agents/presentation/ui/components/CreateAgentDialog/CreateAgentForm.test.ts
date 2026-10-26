import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { focusSettled, render, withQueryClient, withRegistry } from '@test/render.ts';
import { installTestNavigator } from '@test/navigator.ts';
import type { AgentEntity } from '@base/features/agents/domain/entities/agent.entity.ts';
import CreateAgentDialog from './CreateAgentDialog.svelte';

const agent: AgentEntity = {
  id: 'agent-new',
  organizationId: 'org-1',
  name: 'build-runner-02',
  isActive: true,
  connected: false,
  lastSeen: '',
  inFlight: 0,
  host: null,
  createdAt: '',
  updatedAt: '',
};

const fullControl = { scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'fullControl' } };

let createAgent: ReturnType<typeof vi.fn>;
let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;
let nav: ReturnType<typeof installTestNavigator>;

beforeEach(() => {
  createAgent = vi.fn().mockResolvedValue({ agent, secret: 'sk-once' });
  cache = withQueryClient();
  restoreRegistry = withRegistry({
    agents: {
      agentsRepository: {
        createAgent,
        getAgent: vi.fn().mockResolvedValue(agent),
      },
    },
    project: {
      projectRepository: {
        getByOrganizationId: vi.fn().mockResolvedValue({ projects: [] }),
      },
    },
    roles: {
      permissionRepository: {
        getMyPermissions: () => Promise.resolve({ scopes: [fullControl] }),
      },
    },
  });
  contextStore.setState({
    organization: { id: 'org-1', name: 'Acme' },
    project: { id: null, name: null },
  });
  nav = installTestNavigator({ pathname: '/acme/agents' });
  permissionsStore.setState({ permissions: { scopes: [fullControl] } } as never);
});

afterEach(() => {
  cache.restore();
  restoreRegistry();
  nav.restore();
  permissionsStore.setState({ permissions: null });
});

const open = async () => {
  render(CreateAgentDialog, { open: true, onClose: vi.fn() });
  await focusSettled();
  const dialog = within(screen.getByRole('dialog'));
  return { dialog, name: dialog.getByRole('textbox', { name: 'Name' }) };
};

describe('CreateAgentForm', () => {
  it('asks only the name and where the agent takes jobs: the secret name stays hidden', async () => {
    const { dialog, name } = await open();

    expect(dialog.getAllByRole('textbox')).toEqual([name]);
    expect(dialog.queryByRole('textbox', { name: 'Secret name' })).not.toBeInTheDocument();
  });

  it('sends no secret label, so CE names the first secret after the agent', async () => {
    const { dialog, name } = await open();

    await userEvent.type(name, 'build-runner-02');
    await userEvent.click(dialog.getByRole('button', { name: 'Create agent' }));

    await vi.waitFor(() => expect(createAgent).toHaveBeenCalled());
    expect(createAgent.mock.lastCall).toEqual(['org-1', 'build-runner-02']);
  });
});
