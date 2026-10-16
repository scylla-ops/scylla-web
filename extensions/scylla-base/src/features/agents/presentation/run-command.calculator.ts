export type RunMethod = 'docker' | 'compose' | 'source';

export const RUN_METHODS: readonly RunMethod[] = ['docker', 'compose', 'source'];

/** The agent image of this release: change the tag with each release. */
export const AGENT_IMAGE = 'godlyjaaaaj/scylla-agent:0.5.0';

/** Shown in place of a secret that the page does not have. */
export const SECRET_PLACEHOLDER = '<APP_SECRET>';

export interface RunTarget {
  /** The address the agent uses to reach Scylla. */
  address: string;
  appId: string;
  /** `null`: the page does not have it, the command shows `SECRET_PLACEHOLDER`. */
  secret: string | null;
}

/** As it is when it is safe in a shell, else in single quotes. */
const shellArg = (value: string): string =>
  /^[\w@%+=:,./-]+$/.test(value) ? value : `'${value.replace(/'/g, `'\\''`)}'`;

const yamlString = (value: string): string =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

/**
 * The flags and the variables of `binaries/scylla-agent` (`config.rs`): `--control-plane-url`,
 * `--app-id`, `--app-secret`, `--workspace-root`, and `SCYLLA_*` for each.
 */
export const runCommandOf = (method: RunMethod, { address, appId, secret }: RunTarget): string => {
  const url = address.trim();
  const secretArg = secret === null ? SECRET_PLACEHOLDER : shellArg(secret);

  switch (method) {
    case 'docker':
      return [
        'docker run -d --restart unless-stopped \\',
        `  ${AGENT_IMAGE} \\`,
        `  --control-plane-url ${shellArg(url)} \\`,
        `  --app-id ${shellArg(appId)} \\`,
        `  --app-secret ${secretArg}`,
      ].join('\n');
    case 'compose':
      return [
        'services:',
        '  agent:',
        `    image: ${AGENT_IMAGE}`,
        '    restart: unless-stopped',
        '    environment:',
        `      SCYLLA_CONTROL_PLANE_URL: ${yamlString(url)}`,
        `      SCYLLA_APP_ID: ${yamlString(appId)}`,
        `      SCYLLA_APP_SECRET: ${yamlString(secret ?? SECRET_PLACEHOLDER)}`,
      ].join('\n');
    case 'source':
      return [
        'cargo run --release --bin scylla-agent -- \\',
        `  --control-plane-url ${shellArg(url)} \\`,
        `  --app-id ${shellArg(appId)} \\`,
        `  --app-secret ${secretArg} \\`,
        '  --workspace-root "$HOME/.scylla/workspaces"',
      ].join('\n');
  }
};

/** The port of the page, else the default of its scheme: Docker reaches the host on it. */
export const hostPortOf = (origin: string): string => {
  try {
    const url = new URL(origin);
    return url.port || (url.protocol === 'https:' ? '443' : '80');
  } catch {
    return '8080';
  }
};
