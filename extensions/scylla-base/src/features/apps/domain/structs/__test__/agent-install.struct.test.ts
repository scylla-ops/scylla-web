// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_INSTALL_OPTIONS,
  DOCKER_UNINSTALL_COMMAND,
  dockerUpdateCommand,
  formatCountdown,
  installCommands,
  isLoopback,
  LOG_COMMANDS,
  releaseUrl,
  secondsLeft,
  uninstallCommand,
  updateCommand,
} from '../agent-install.struct.ts';

const IMAGE = 'ghcr.io/scylla-ops/scylla-agent:0.7.0';

describe('installCommands', () => {
  it('gives the one-command installs with the code and the address, and no default option', () => {
    const commands = installCommands(
      'https://scylla.acme.dev/',
      'CODE',
      IMAGE,
      DEFAULT_INSTALL_OPTIONS,
    );

    const unix =
      'curl -fsSL https://scylla.acme.dev/install.sh | sh -s -- CODE --url https://scylla.acme.dev';
    expect(commands.linux).toBe(unix);
    expect(commands.macos).toBe(unix);
    expect(commands.windows).toBe(
      '& ([scriptblock]::Create((irm https://scylla.acme.dev/install.ps1))) -JoinCode CODE ' +
        '-Url https://scylla.acme.dev',
    );
    expect(commands.docker).toBe(
      'docker run -d --name scylla-agent --restart unless-stopped ' +
        '-e SCYLLA_URL=https://scylla.acme.dev -e SCYLLA_JOIN_CODE=CODE ' +
        `-v scylla-agent:/var/lib/scylla-agent ${IMAGE}`,
    );
    expect(commands.manual).toBe(
      'scylla-agent join https://scylla.acme.dev CODE\nscylla-agent run --capacity 1',
    );
  });

  it('adds the capacity and the container runtime to each way', () => {
    const commands = installCommands('https://s', 'C', IMAGE, {
      ...DEFAULT_INSTALL_OPTIONS,
      capacity: 2,
      containerRuntime: 'docker',
    });

    expect(commands.linux).toMatch(/ C --url https:\/\/s --capacity 2 --container-runtime docker$/);
    expect(commands.windows).toMatch(/-Url https:\/\/s -Capacity 2 -ContainerRuntime docker$/);
    expect(commands.docker).toContain('-e SCYLLA_AGENT_CAPACITY=2 ');
    expect(commands.manual).toMatch(/run --capacity 2 --container-runtime docker$/);
  });

  it('passes no runtime to each way that runs no container step', () => {
    const commands = installCommands('https://s', 'C', IMAGE, {
      ...DEFAULT_INSTALL_OPTIONS,
      containerRuntime: 'none',
    });

    expect(commands.macos).toMatch(/--container-runtime none$/);
    expect(commands.manual).toMatch(/run --capacity 1 --container-runtime none$/);
  });

  it('sends a container to the machine for a server on the machine of the browser', () => {
    const local = (server: string) =>
      installCommands(server, 'C', IMAGE, DEFAULT_INSTALL_OPTIONS).docker;

    expect(local('http://localhost:3000')).toContain(
      '-e SCYLLA_URL=http://host.docker.internal:3000 ',
    );
    expect(local('http://127.0.0.1:3000/')).toContain(
      '-e SCYLLA_URL=http://host.docker.internal:3000 ',
    );
    expect(local('http://[::1]:3000')).toContain('-e SCYLLA_URL=http://host.docker.internal:3000 ');
    expect(
      installCommands('http://localhost:3000', 'C', IMAGE, DEFAULT_INSTALL_OPTIONS).linux,
    ).toContain('--url http://localhost:3000');
  });

  it('gives a container step the socket of the machine, and the same path for its folder', () => {
    const options = { ...DEFAULT_INSTALL_OPTIONS, dockerContainers: true };
    const [folder, run] = installCommands('https://s', 'C', IMAGE, options).docker.split('\n');

    expect(folder).toBe('sudo install -d -o 10001 -g 10001 -m 700 /var/lib/scylla-agent');
    expect(run).toContain('--group-add "$(stat -c %g /var/run/docker.sock)"');
    expect(run).toContain('-e SCYLLA_AGENT_CONTAINER_RUNTIME=docker');
    expect(run).toContain('-v /var/run/docker.sock:/var/run/docker.sock');
    expect(run).toContain(`-v /var/lib/scylla-agent:/var/lib/scylla-agent ${IMAGE}`);
    expect(run).not.toContain('--network host');
  });

  it('uses the network of the machine for a socket and a server on the machine', () => {
    const options = { ...DEFAULT_INSTALL_OPTIONS, dockerContainers: true };
    const { docker } = installCommands('http://localhost:3000', 'C', IMAGE, options);

    expect(docker).toContain('--network host');
    expect(docker).toContain('-e SCYLLA_URL=http://localhost:3000 ');
  });
});

describe('isLoopback', () => {
  it('finds only the addresses of the machine itself', () => {
    expect(isLoopback('http://localhost:5173')).toBe(true);
    expect(isLoopback('http://0.0.0.0:3000')).toBe(true);
    expect(isLoopback('https://scylla.acme.dev')).toBe(false);
    expect(isLoopback('not an address')).toBe(false);
  });
});

describe('the commands of an installed agent', () => {
  it('gives the script of the system of the agent', () => {
    expect(updateCommand('https://s/', 'linux')).toBe(
      'curl -fsSL https://s/install.sh | sh -s -- --update',
    );
    expect(uninstallCommand('https://s', 'macos')).toBe(
      'curl -fsSL https://s/install.sh | sh -s -- --uninstall',
    );
    expect(updateCommand('https://s', 'windows')).toBe(
      '& ([scriptblock]::Create((irm https://s/install.ps1))) -Update',
    );
    expect(uninstallCommand('https://s', 'windows')).toBe(
      '& ([scriptblock]::Create((irm https://s/install.ps1))) -Uninstall',
    );
  });

  it('gives no script for a system with no script', () => {
    expect(updateCommand('https://s', 'freebsd')).toBeNull();
    expect(uninstallCommand('https://s', 'freebsd')).toBeNull();
  });

  it('keeps the volume of the key when a container changes, and removes it at the end', () => {
    expect(dockerUpdateCommand(IMAGE)).toBe(
      'docker rm -f scylla-agent\n' +
        'docker run -d --name scylla-agent --restart unless-stopped ' +
        `-v scylla-agent:/var/lib/scylla-agent ${IMAGE}`,
    );
    expect(DOCKER_UNINSTALL_COMMAND).toContain('docker volume rm scylla-agent');
  });
});

describe('releaseUrl', () => {
  it('goes to the release of the version, or to all releases with no version', () => {
    expect(releaseUrl('0.7.0')).toBe('https://github.com/scylla-ops/scylla-ce/releases/tag/v0.7.0');
    expect(releaseUrl(undefined)).toBe('https://github.com/scylla-ops/scylla-ce/releases');
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

describe('the logs of an agent', () => {
  it('reads the file of the agent of the user on Windows, or else the files of the service', () => {
    const [user, service, read] = LOG_COMMANDS.windows.split('\n');

    expect(user).toBe(String.raw`$log = "$env:LOCALAPPDATA\scylla-agent\agent.log"`);
    expect(service).toContain(
      String.raw`if (-not (Test-Path $log)) { $log = "$env:ProgramData\scylla-agent\agent.`,
    );
    expect(read).toBe('Get-Content -Wait $log');
  });
});
