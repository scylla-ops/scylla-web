/** The container runtime of a new agent. `auto` lets the agent find Docker or Podman. */
export type ContainerRuntime = 'auto' | 'docker' | 'podman' | 'none';

/** The ways to install an agent that the install step shows. */
export type InstallWay = 'linux' | 'macos' | 'windows' | 'docker';

/** The run options of a new agent. */
export interface InstallOptions {
  /** The jobs that the agent runs at once, from 1. */
  capacity: number;
  containerRuntime: ContainerRuntime;
  /** Docker only: the agent runs container steps with the Docker of the machine. */
  dockerContainers: boolean;
}

export const DEFAULT_INSTALL_OPTIONS: InstallOptions = {
  capacity: 1,
  containerRuntime: 'auto',
  dockerContainers: false,
};

/** What the server tells about an agent that it can use. */
export interface ServerInfo {
  version: string;
  /** The image of the agent, with its tag. */
  agentImage: string;
}

/** The image of the agent until the answer of the server comes. */
export const AGENT_IMAGE = 'ghcr.io/scylla-ops/scylla-agent';

const RELEASES = 'https://github.com/scylla-ops/scylla-ce/releases';

/** The page of the downloads of `version`. */
export const releaseUrl = (version: string | undefined): string =>
  version ? `${RELEASES}/tag/v${version}` : RELEASES;

/** The part of the README that tells how to build the agent from source. */
export const SOURCE_URL = 'https://github.com/scylla-ops/scylla-ce#run-an-agent';

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]', '0.0.0.0']);

const withoutSlash = (server: string): string => server.replace(/\/+$/, '');

/** The address only reaches this machine. In a container, it is the container itself. */
export const isLoopback = (server: string): boolean =>
  URL.canParse(server) && LOOPBACK.has(new URL(server).hostname);

const addressInContainer = (server: string): string => {
  if (!isLoopback(server)) return server;
  const url = new URL(server);
  url.hostname = 'host.docker.internal';
  return withoutSlash(url.href);
};

const DOCKER_START = 'docker run -d --name scylla-agent --restart unless-stopped';

const dockerCommand = (
  base: string,
  code: string,
  image: string,
  { capacity, dockerContainers }: InstallOptions,
): string => {
  const capacityOption = capacity === 1 ? '' : ` -e SCYLLA_AGENT_CAPACITY=${capacity}`;
  if (!dockerContainers) {
    const join = `-e SCYLLA_URL=${addressInContainer(base)} -e SCYLLA_JOIN_CODE=${code}`;
    return `${DOCKER_START} ${join}${capacityOption} -v scylla-agent:/var/lib/scylla-agent ${image}`;
  }
  const network = isLoopback(base) ? ' --network host' : '';
  const group = '--group-add "$(stat -c %g /var/run/docker.sock)"';
  const join = `-e SCYLLA_URL=${base} -e SCYLLA_JOIN_CODE=${code}`;
  const socket = '-v /var/run/docker.sock:/var/run/docker.sock';
  return (
    'sudo install -d -o 10001 -g 10001 -m 700 /var/lib/scylla-agent\n' +
    `${DOCKER_START}${network} ${group} ${join}${capacityOption} ` +
    `-e SCYLLA_AGENT_CONTAINER_RUNTIME=docker ${socket} ` +
    `-v /var/lib/scylla-agent:/var/lib/scylla-agent ${image}`
  );
};

/** The commands that install an agent with a join code, for each way, and by hand. */
export type InstallCommands = Record<InstallWay, string> & {
  /** `scylla-agent join` then `scylla-agent run`, one per line. */
  manual: string;
};

/** Returns the commands that install an agent of `server` with a join code. */
export const installCommands = (
  server: string,
  code: string,
  image: string,
  options: InstallOptions,
): InstallCommands => {
  const { capacity, containerRuntime } = options;
  const base = withoutSlash(server);
  const runtime = containerRuntime === 'auto' ? null : containerRuntime;
  const unixOptions = [
    capacity === 1 ? '' : ` --capacity ${capacity}`,
    runtime ? ` --container-runtime ${runtime}` : '',
  ].join('');
  const windowsOptions = [
    capacity === 1 ? '' : ` -Capacity ${capacity}`,
    runtime ? ` -ContainerRuntime ${runtime}` : '',
  ].join('');
  const unix = `curl -fsSL ${base}/install.sh | sh -s -- ${code} --url ${base}${unixOptions}`;
  const runOptions = runtime ? ` --container-runtime ${runtime}` : '';
  return {
    linux: unix,
    macos: unix,
    windows: `& ([scriptblock]::Create((irm ${base}/install.ps1))) -JoinCode ${code} -Url ${base}${windowsOptions}`,
    docker: dockerCommand(base, code, image, options),
    manual: `scylla-agent join ${base} ${code}\nscylla-agent run --capacity ${capacity}${runOptions}`,
  };
};

const scriptCommand = (
  server: string,
  os: string,
  action: 'update' | 'uninstall',
): string | null => {
  const base = withoutSlash(server);
  if (os === 'linux' || os === 'macos')
    return `curl -fsSL ${base}/install.sh | sh -s -- --${action}`;
  if (os !== 'windows') return null;
  const flag = action === 'update' ? '-Update' : '-Uninstall';
  return `& ([scriptblock]::Create((irm ${base}/install.ps1))) ${flag}`;
};

/** The command that replaces the binary of an agent on `os`, or `null` with no script for it. */
export const updateCommand = (server: string, os: string): string | null =>
  scriptCommand(server, os, 'update');

/** The command that removes an agent from `os`, or `null` with no script for it. */
export const uninstallCommand = (server: string, os: string): string | null =>
  scriptCommand(server, os, 'uninstall');

/** Replaces the container of an agent. The volume keeps its key. */
export const dockerUpdateCommand = (image: string): string =>
  `docker rm -f scylla-agent\n${DOCKER_START} -v scylla-agent:/var/lib/scylla-agent ${image}`;

export const DOCKER_UNINSTALL_COMMAND = 'docker rm -f scylla-agent\ndocker volume rm scylla-agent';

/** The command that shows the logs of an agent, for each way. */
export const LOG_COMMANDS: Record<InstallWay, string> = {
  linux: 'journalctl -u scylla-agent -f',
  macos: 'tail -f ~/.scylla-agent/agent.log',
  windows:
    'Get-Content -Wait "$env:ProgramData\\scylla-agent\\agent.$(Get-Date -Format yyyy-MM-dd).log"',
  docker: 'docker logs -f scylla-agent',
};

/** The seconds before the end of a join code at `now`, from 0. */
export const secondsLeft = (expiresAt: string, now: Date): number =>
  Math.max(0, Math.floor((Date.parse(expiresAt) - now.getTime()) / 1000));

/** `14:21` for 861 seconds. */
export const formatCountdown = (seconds: number): string =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
