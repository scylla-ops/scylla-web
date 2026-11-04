// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_INSTALL_OPTIONS,
  formatCountdown,
  installCommands,
  secondsLeft,
} from '../agent-install.struct.ts';

describe('installCommands', () => {
  it('gives the one-command installs with the code, and no default option', () => {
    const commands = installCommands('https://scylla.acme.dev/', 'CODE', DEFAULT_INSTALL_OPTIONS);

    expect(commands.unix).toBe('curl -fsSL https://scylla.acme.dev/install.sh | sh -s -- CODE');
    expect(commands.windows).toBe(
      '& ([scriptblock]::Create((irm https://scylla.acme.dev/install.ps1))) -JoinCode CODE',
    );
    expect(commands.docker).toBe(
      'docker run -d --name scylla-agent -e SCYLLA_URL=https://scylla.acme.dev ' +
        '-e SCYLLA_JOIN_CODE=CODE -v scylla-agent:/var/lib/scylla-agent ' +
        'ghcr.io/scylla-ops/scylla-agent',
    );
    expect(commands.manual).toBe(
      'scylla-agent join https://scylla.acme.dev CODE\nscylla-agent run --capacity 1',
    );
  });

  it('adds the capacity and the container runtime to each way', () => {
    const commands = installCommands('https://s', 'C', { capacity: 2, containerRuntime: 'docker' });

    expect(commands.unix).toMatch(/ C --capacity 2 --container-runtime docker$/);
    expect(commands.windows).toMatch(/-JoinCode C -Capacity 2 -ContainerRuntime docker$/);
    expect(commands.docker).toContain('-e SCYLLA_AGENT_CAPACITY=2 ');
    expect(commands.manual).toMatch(/run --capacity 2 --container-runtime docker$/);
  });

  it('runs no container step with no runtime', () => {
    const commands = installCommands('https://s', 'C', { capacity: 1, containerRuntime: 'none' });

    expect(commands.unix).toMatch(/--container-runtime none$/);
    expect(commands.manual).toMatch(/run --capacity 1$/);
  });
});

describe('the expiry of a join code', () => {
  it('counts the seconds left, from 0, as minutes and seconds', () => {
    const now = new Date('2026-11-04T12:00:00.000Z');

    expect(secondsLeft('2026-11-04T12:14:21.500Z', now)).toBe(861);
    expect(secondsLeft('2026-11-04T11:59:00.000Z', now)).toBe(0);
    expect(formatCountdown(861)).toBe('14:21');
    expect(formatCountdown(5)).toBe('0:05');
  });
});
