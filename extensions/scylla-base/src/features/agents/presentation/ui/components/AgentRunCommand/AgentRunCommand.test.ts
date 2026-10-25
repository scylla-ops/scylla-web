import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/svelte';
import { render } from '@test/render.ts';
import AgentRunCommand from './AgentRunCommand.svelte';

const SECRET = '7f3a9c0e5b2d4f6a8c1e3b5d7f9a2c4e6b8d0f1a3c5e7b9d2f4a6c8e0b1d3f5a';

const command = () => document.querySelector('[data-tour="agent-run-command"] pre')?.textContent;

describe('AgentRunCommand', () => {
  it('shows the placeholder without a mask and without an eye button when it has no secret', () => {
    render(AgentRunCommand, { appId: 'agent-1', secret: null });

    expect(command()).toContain('--app-secret <APP_SECRET>');
    expect(command()).not.toContain('•');
    expect(screen.queryByRole('button', { name: /the secret$/ })).not.toBeInTheDocument();
  });

  it('masks a real secret until the dialog shows it, and has no eye button of its own', async () => {
    const { rerender } = render(AgentRunCommand, { appId: 'agent-1', secret: SECRET });

    expect(document.body.innerHTML).not.toContain(SECRET);
    expect(screen.queryByRole('button', { name: /the secret$/ })).not.toBeInTheDocument();

    await rerender({ revealed: true });

    expect(command()).toContain(`--app-secret ${SECRET}`);
  });
});
