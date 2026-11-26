import type { CustomIcon } from '@shared/domain/structs/custom-icon.struct.ts';
import type { JobStatus } from '@shared/domain/structs/job-status.struct.ts';

/**
 * The machine identity of a workspace. An agent is an app that runs jobs (`runner`); a CI or a
 * script is an app that does not. An app proves who it is with a key pair: the private key never
 * leaves its machine.
 */
export interface AppEntity {
  id: string;
  workspaceId: string;
  name: string;
  /** Runs the jobs of the pipelines: an agent. */
  runner: boolean;
  /** An agent with an open stream now. */
  connected: boolean;
  /** Empty if it never connected. */
  lastSeenAt: string;
  /** `null` until an agent said hello. */
  host: AppHost | null;
  /** The last use of the machine of the agent. `null` before its first sample. */
  lastSample?: AppSample | null;
  /** The actor that created the app. The server lets it manage the app with no other role. */
  createdBy: string;
  createdAt: string;
  /** The jobs that the agent holds now: taken and not ended. */
  runningJobs: number;
  /** Empty while the app is enabled. A disabled app gets no token and no job. */
  disabledAt: string;
  /** How the agent fits the server, from the protocol of its last hello. */
  compatibility: AgentCompatibility;
  /** The features that the server can need and that the agent does not tell, e.g. `checkout`. */
  missingFeatures: string[];
  /**
   * The labels that an admin gave. A pipeline that asks labels runs its jobs only on an agent
   * with each of them, from an admin or from its machine.
   */
  labels: string[];
  /**
   * The labels from the machine of the last hello: the system (`linux`, `macos`, `windows`), the
   * architecture (`x64`, `arm64`) and `container`. Empty before the first hello.
   */
  automaticLabels: string[];
  /** The icon that an admin chose. Absent: the default icon of its kind. */
  icon?: CustomIcon;
}

/**
 * `outdated`: the agent connects and gets only the jobs that it can run. `unsupported`: the
 * server refuses it. `unknown`: not an agent, no hello yet, or a value newer than this build.
 */
export type AgentCompatibility = 'compatible' | 'outdated' | 'unsupported' | 'unknown';

/** The first agent protocol that gets the code of a job. */
export const CHECKOUT_PROTOCOL = 2;

/** The agent must be updated to run each job of the server. */
export const needsUpdate = (app: Pick<AppEntity, 'compatibility'>): boolean =>
  app.compatibility === 'outdated' || app.compatibility === 'unsupported';

/**
 * What gives a missing feature to the agent: a new agent, or, for `checkout` on an agent with
 * the protocol, git on its machine.
 */
export const featureFixOf = (
  host: Pick<AppHost, 'protocol'>,
  feature: string,
): 'update-agent' | 'install-git' =>
  feature === 'checkout' && host.protocol >= CHECKOUT_PROTOCOL ? 'install-git' : 'update-agent';

/** A sample of the use of the machine of an agent. */
export interface AppSample {
  at: string;
  /** 0 to 100, for all the CPUs of the machine. */
  cpuPercent: number;
  memoryUsedBytes: number;
}

export interface AppHost {
  version: string;
  os: string;
  arch: string;
  hostname: string;
  /** `null` when the agent could not read it. */
  cpuCount: number | null;
  totalMemoryMb: number | null;
  /** The jobs that the agent runs at once. */
  capacity: number;
  /** `docker` or `podman`, or empty: then the nodes with a container do not go to it. */
  containerRuntime: string;
  /** The protocol level of the agent, separate from its version. 0 for an agent before it. */
  protocol: number;
  /** The commit of the build of the agent. Empty when the build has none. */
  build: string;
  /** What the agent can do, e.g. `checkout`. */
  features: string[];
}

/** A public key of an app. A revoked key signs nothing any more. */
export interface AppKeyEntity {
  id: string;
  /** The name of the key, for example the host name of its machine. Empty if it has none. */
  label: string;
  createdAt: string;
  /** Empty while the key is valid. */
  revokedAt: string;
  /** The last token that the key signed for. Empty before its first use. */
  lastUsedAt: string;
}

/** A code that a machine uses one time, before its expiry, to join the app with a new key. */
export interface JoinCode {
  code: string;
  expiresAt: string;
}

export interface CreatedApp {
  app: AppEntity;
  joinCode: JoinCode;
  /** `false`: the app exists, but a role `runner` could not be given. The agent takes no job. */
  accessGranted: boolean;
}

export interface AppDetails {
  app: AppEntity;
  keys: AppKeyEntity[];
}

/** `never`: no machine joined yet. `offline`: an agent with no open stream. */
export type AppState = 'online' | 'offline' | 'never';

export const appStateOf = (
  app: Pick<AppEntity, 'runner' | 'connected' | 'lastSeenAt'>,
): AppState => {
  if (app.connected) return 'online';
  if (!app.lastSeenAt) return 'never';
  return app.runner ? 'offline' : 'online';
};

/** A job that the server placed on an agent, as the recent jobs show it. */
export interface AppJob {
  id: string;
  pipelineId: string;
  projectId: string;
  status: JobStatus;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}
