/** The container runtime of a new agent. `auto` lets the install script find Docker or Podman. */
export type ContainerRuntime = 'auto' | 'docker' | 'podman' | 'none';

/** The ways to install an agent that the install step shows. */
export type InstallWay = 'unix' | 'windows' | 'docker';

/** The run options of a new agent. */
export interface InstallOptions {
  /** The jobs that the agent runs at once, from 1. */
  capacity: number;
  containerRuntime: ContainerRuntime;
}

export const DEFAULT_INSTALL_OPTIONS: InstallOptions = { capacity: 1, containerRuntime: 'auto' };

/** The image of the agent. */
export const AGENT_IMAGE = 'ghcr.io/scylla-ops/scylla-agent';

/** The commands that install an agent with a join code, for each way, and by hand. */
export interface InstallCommands {
  unix: string;
  windows: string;
  docker: string;
  /** `scylla-agent join` then `scylla-agent run`, one per line. */
  manual: string;
}

/** Returns the commands that install an agent of `server` with a join code. */
export const installCommands = (
  server: string,
  code: string,
  { capacity, containerRuntime }: InstallOptions,
): InstallCommands => {
  const base = server.replace(/\/+$/, '');
  const runtime = containerRuntime === 'auto' ? null : containerRuntime;
  const unixOptions = [
    capacity === 1 ? '' : ` --capacity ${capacity}`,
    runtime ? ` --container-runtime ${runtime}` : '',
  ].join('');
  const windowsOptions = [
    capacity === 1 ? '' : ` -Capacity ${capacity}`,
    runtime ? ` -ContainerRuntime ${runtime}` : '',
  ].join('');
  const dockerOptions = capacity === 1 ? '' : ` -e SCYLLA_AGENT_CAPACITY=${capacity}`;
  const runOptions = [
    ` --capacity ${capacity}`,
    runtime && runtime !== 'none' ? ` --container-runtime ${runtime}` : '',
  ].join('');
  return {
    unix: `curl -fsSL ${base}/install.sh | sh -s -- ${code}${unixOptions}`,
    windows: `& ([scriptblock]::Create((irm ${base}/install.ps1))) -JoinCode ${code}${windowsOptions}`,
    docker:
      `docker run -d --name scylla-agent -e SCYLLA_URL=${base} -e SCYLLA_JOIN_CODE=${code}` +
      `${dockerOptions} -v scylla-agent:/var/lib/scylla-agent ${AGENT_IMAGE}`,
    manual: `scylla-agent join ${base} ${code}\nscylla-agent run${runOptions}`,
  };
};

/** The seconds before the end of a join code at `now`, from 0. */
export const secondsLeft = (expiresAt: string, now: Date): number =>
  Math.max(0, Math.floor((Date.parse(expiresAt) - now.getTime()) / 1000));

/** `14:21` for 861 seconds. */
export const formatCountdown = (seconds: number): string =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
