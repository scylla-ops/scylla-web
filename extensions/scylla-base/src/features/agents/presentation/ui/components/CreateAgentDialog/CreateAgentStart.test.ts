import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/svelte';
import { render } from '@test/render.ts';
import type { AgentEntity } from '@base/features/agents/domain/entities/agent.entity.ts';
import {
  runCommandOf,
  type RunMethod,
} from '@base/features/agents/presentation/presenters/run-command.presenter.ts';
import CreateAgentStart from './CreateAgentStart.svelte';

const SECRET = '7f3a9c0e5b2d4f6a8c1e3b5d7f9a2c4e6b8d0f1a3c5e7b9d2f4a6c8e0b1d3f5a';
const BULLETS = '•'.repeat(SECRET.length);

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

const METHODS: [RunMethod, string][] = [
  ['docker', 'Docker'],
  ['compose', 'Docker Compose'],
  ['source', 'From source'],
];

let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});

const renderStart = () =>
  render(CreateAgentStart, {
    created: { agent, secret: SECRET },
    grantFailed: false,
    canWatch: false,
    liveAgent: undefined,
    connected: false,
  });

const anchor = (name: string) => {
  const element = document.querySelector(`[data-tour="${name}"]`);
  if (!(element instanceof HTMLElement)) throw new Error(`no ${name} anchor`);
  return element;
};

const shownIn = (name: string) => anchor(name).querySelector('pre')?.textContent ?? '';
const copyIn = (name: string) => within(anchor(name)).getByRole('button', { name: 'Copy' });
const chooseMethod = (label: string) => fireEvent.click(screen.getByRole('radio', { name: label }));

describe('CreateAgentStart', () => {
  it('masks the secret in its box and in each command, with the real value nowhere in the DOM', async () => {
    renderStart();

    expect(shownIn('agent-secret')).toContain(BULLETS);
    for (const [, label] of METHODS) {
      await chooseMethod(label);
      expect(shownIn('agent-run-command')).toContain(BULLETS);
      expect(document.body.innerHTML).not.toContain(SECRET);
    }
  });

  it('shows and hides the secret in the box and in the three commands with one eye button', async () => {
    renderStart();
    expect(screen.getAllByRole('button', { name: 'Show the secret' })).toHaveLength(1);
    const eye = screen.getByRole('button', { name: 'Show the secret' });

    await fireEvent.click(eye);

    expect(eye).toHaveAttribute('aria-pressed', 'true');
    expect(shownIn('agent-secret')).toBe(SECRET);
    for (const [, label] of METHODS) {
      await chooseMethod(label);
      expect(shownIn('agent-run-command')).toContain(SECRET);
    }

    await fireEvent.click(eye);

    expect(eye).toHaveAttribute('aria-pressed', 'false');

    for (const [, label] of METHODS) {
      await chooseMethod(label);
      expect(shownIn('agent-run-command')).toContain(BULLETS);
    }
    expect(document.body.innerHTML).not.toContain(SECRET);
  });

  it('copies the real secret, and each command with the real secret, while they are masked', async () => {
    renderStart();

    await fireEvent.click(copyIn('agent-secret'));
    expect(writeText).toHaveBeenLastCalledWith(SECRET);

    for (const [method, label] of METHODS) {
      await chooseMethod(label);
      await fireEvent.click(copyIn('agent-run-command'));
      expect(writeText).toHaveBeenLastCalledWith(
        runCommandOf(method, { address: window.location.origin, appId: agent.id, secret: SECRET }),
      );
    }
    expect(document.body.innerHTML).not.toContain(SECRET);
  });

  it('keeps the anchors of the tour: the secret box with its copy button first, and the command', () => {
    renderStart();

    expect(anchor('agent-secret').querySelector('button')).toBe(copyIn('agent-secret'));
    expect(document.activeElement).toBe(copyIn('agent-secret'));
    expect(anchor('agent-run-command')).toContainElement(copyIn('agent-run-command'));
  });
});
