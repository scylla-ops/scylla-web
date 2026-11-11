import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { toast } from 'svelte-sonner';
import { holdsLeave } from '@scylla/core-sdk';
import { contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import { createLeavePrompt } from './leave-prompt.state.svelte.ts';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const AGENT = { id: 'a-1', name: 'build-win-01' };

let navigator: ReturnType<typeof installTestNavigator>;
let cleanup: () => void = () => undefined;

const open = (input: { active?: boolean; remove?: () => Promise<unknown> } = {}) => {
  const state = $state({ active: input.active ?? true, deleting: false });
  const remove = vi.fn(
    input.remove ??
      (() => {
        state.deleting = true;
        return Promise.resolve();
      }),
  );
  let prompt!: ReturnType<typeof createLeavePrompt>;
  cleanup = $effect.root(() => {
    prompt = createLeavePrompt(() => ({
      active: state.active,
      agent: AGENT,
      deleting: state.deleting,
      remove,
    }));
  });
  flushSync();
  return { prompt, state, remove };
};

/** What the router does before a navigation of the user. */
const leaveTo = () => {
  const go = vi.fn();
  return { go, held: holdsLeave(go) };
};

beforeEach(() => {
  vi.clearAllMocks();
  navigator = installTestNavigator({ pathname: '/acme/agents/a-1/connect' });
  contextStore.getState().setWorkspace('ws-1', 'Acme', 'acme');
});

afterEach(() => {
  cleanup();
  navigator.restore();
  contextStore.getState().setWorkspace(null, null, null);
});

describe('the leave prompt of a new agent', () => {
  it('holds a navigation only while the agent waits for its first machine', () => {
    const { prompt, state } = open({ active: false });

    expect(leaveTo().held).toBe(false);
    expect(prompt.open).toBe(false);

    state.active = true;
    flushSync();
    const { go, held } = leaveTo();

    expect(held).toBe(true);
    expect(prompt.open).toBe(true);
    expect(go).not.toHaveBeenCalled();
  });

  it('stops to hold the navigation once a machine joins', () => {
    const { state } = open();

    state.active = false;
    flushSync();

    expect(leaveTo().held).toBe(false);
  });

  it('stays on the page with Stay, and drops the navigation', () => {
    const { prompt, remove } = open();
    const { go } = leaveTo();

    prompt.stay();

    expect(prompt.open).toBe(false);
    expect(go).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('goes on and keeps the agent with Keep, with a toast that finishes its setup', () => {
    const { prompt, remove } = open();
    const { go } = leaveTo();

    prompt.keep();

    expect(go).toHaveBeenCalledTimes(1);
    expect(prompt.open).toBe(false);
    expect(remove).not.toHaveBeenCalled();
    const [title, options] = vi.mocked(toast.success).mock.calls[0];
    expect(title).toBe('build-win-01 is kept');
    expect(options?.description).toBe(
      'It waits for a machine. Finish its setup when you are ready.',
    );
    const action = options?.action as { label: string; onClick: () => void };
    expect(action.label).toBe('Finish setup');
    action.onClick();
    expect(navigator.navigate).toHaveBeenCalledWith('/acme/agents/a-1/connect', undefined);
  });

  it('deletes the agent with Delete, then goes on', async () => {
    const { prompt, remove } = open();
    const { go } = leaveTo();

    prompt.delete();

    expect(remove).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(go).toHaveBeenCalledTimes(1));
    expect(prompt.open).toBe(false);
  });

  it('stays open when the delete fails, and does not leave', async () => {
    const { prompt, remove } = open({ remove: () => Promise.reject(new Error('refused')) });
    const { go } = leaveTo();

    prompt.delete();

    await vi.waitFor(() => expect(remove).toHaveBeenCalledTimes(1));
    await Promise.resolve();
    expect(go).not.toHaveBeenCalled();
    expect(prompt.open).toBe(true);
  });

  it('asks the browser before a reload or a closed tab, and never deletes for it', () => {
    const { state, remove } = open();
    const reload = new Event('beforeunload', { cancelable: true });

    window.dispatchEvent(reload);
    expect(reload.defaultPrevented).toBe(true);

    state.active = false;
    flushSync();
    const later = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(later);
    expect(later.defaultPrevented).toBe(false);
    expect(remove).not.toHaveBeenCalled();
  });
});
