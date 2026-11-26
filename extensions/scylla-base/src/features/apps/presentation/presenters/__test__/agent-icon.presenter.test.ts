// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  agentIconChange,
  agentIconChoice,
  agentProfile,
  defaultAppIcon,
} from '../agent-icon.presenter.ts';

describe('agentProfile', () => {
  it('shows the image, or the glyph in its color, that an admin chose', () => {
    const image = agentProfile({ name: 'grok_vps', icon: { kind: 'image', imageId: 'img-1' } });
    const glyph = agentProfile({
      name: 'scylla-ci',
      icon: { kind: 'glyph', name: 'cpu', color: '#A1B2C3' },
    });

    expect(image).toEqual({ username: '', displayName: 'grok_vps', avatarUrl: '/images/img-1' });
    expect(glyph).toEqual({
      username: '',
      displayName: 'scylla-ci',
      avatarGlyph: 'cpu',
      avatarColor: '#A1B2C3',
    });
  });

  it('gives a glyph with no color the color of an agent, and no icon the default look', () => {
    const plain = agentProfile({ name: 'a', icon: { kind: 'glyph', name: 'server' } });

    expect(plain.avatarColor).toBe('info');
    expect(agentProfile({ name: 'mac-mini' })).toEqual({ username: '', displayName: 'mac-mini' });
  });

  it('gives a glyph with no color of another app the grey of an app', () => {
    const app = agentProfile({ name: 'ci', runner: false, icon: { kind: 'glyph', name: 'key' } });

    expect(app.avatarColor).toBe('muted-foreground');
  });
});

describe('defaultAppIcon', () => {
  it('is a bot in the color of the information for an agent, and grey blocks for an app', () => {
    expect(defaultAppIcon(true)).toEqual({ glyph: 'bot', color: 'info' });
    expect(defaultAppIcon(false)).toEqual({ glyph: 'blocks', color: 'muted-foreground' });
  });
});

describe('agentIconChoice', () => {
  it('opens the picker on the icon of the agent', () => {
    expect(agentIconChoice(undefined)).toEqual({ kind: 'default' });
    expect(agentIconChoice({ kind: 'glyph', name: 'server', color: 'chart-3' })).toEqual({
      kind: 'glyph',
      name: 'server',
      color: 'chart-3',
    });
    expect(agentIconChoice({ kind: 'image', imageId: 'img-1' })).toEqual({
      kind: 'image',
      url: '/images/img-1',
    });
  });
});

describe('agentIconChange', () => {
  it('sends a glyph, the bytes of a new image, or the default icon', async () => {
    const file = new File([new Uint8Array([1, 2])], 'a.png', { type: 'image/png' });
    const image = { kind: 'image', imageId: 'img-1' } as const;

    expect(await agentIconChange({ kind: 'glyph', name: 'cpu', color: 'chart-5' }, undefined)).toEqual(
      { kind: 'glyph', name: 'cpu', color: 'chart-5' },
    );
    expect(await agentIconChange({ kind: 'image', url: 'blob:1', file }, undefined)).toEqual({
      kind: 'image',
      data: new Uint8Array([1, 2]),
    });
    expect(await agentIconChange({ kind: 'default' }, image)).toEqual({ kind: 'default' });
  });

  it('changes nothing for the image that the agent has, or the default icon that it has', async () => {
    const image = { kind: 'image', imageId: 'img-1' } as const;

    expect(await agentIconChange({ kind: 'image', url: '/images/img-1' }, image)).toBeUndefined();
    expect(await agentIconChange({ kind: 'default' }, undefined)).toBeUndefined();
  });
});
