// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { AGENT_IMAGE, hostPortOf, RUN_METHODS, runCommandOf } from '../run-command.presenter.ts';

const target = { address: 'http://127.0.0.1:8081', appId: 'app-1', secret: 'abc123' };

describe('runCommandOf', () => {
  it('runs the pinned image with Docker, restarted unless stopped, with the agent flags', () => {
    expect(runCommandOf('docker', target)).toBe(
      [
        'docker run -d --restart unless-stopped \\',
        `  ${AGENT_IMAGE} \\`,
        '  --control-plane-url http://127.0.0.1:8081 \\',
        '  --app-id app-1 \\',
        '  --app-secret abc123',
      ].join('\n'),
    );
  });

  it('gives Docker Compose the SCYLLA_ variables that the agent reads', () => {
    const yaml = runCommandOf('compose', target);

    expect(yaml).toContain(`image: ${AGENT_IMAGE}`);
    expect(yaml).toContain('restart: unless-stopped');
    expect(yaml).toContain('SCYLLA_CONTROL_PLANE_URL: "http://127.0.0.1:8081"');
    expect(yaml).toContain('SCYLLA_APP_ID: "app-1"');
    expect(yaml).toContain('SCYLLA_APP_SECRET: "abc123"');
  });

  it('runs from a checkout with a workspace root in the home directory', () => {
    const command = runCommandOf('source', target);

    expect(command.startsWith('cargo run --release --bin scylla-agent -- \\')).toBe(true);
    expect(command).toContain('--workspace-root "$HOME/.scylla/workspaces"');
  });

  it('quotes an address that a shell would split', () => {
    expect(runCommandOf('docker', { ...target, address: "http://my host/it's" })).toContain(
      `--control-plane-url 'http://my host/it'\\''s'`,
    );
  });

  it('keeps a CE secret as it is in each command, so that CopyBox can mask it', () => {
    const secret = '7f3a9c0e5b2d4f6a8c1e3b5d7f9a2c4e6b8d0f1a3c5e7b9d2f4a6c8e0b1d3f5a';

    for (const method of RUN_METHODS) {
      expect(runCommandOf(method, { ...target, secret })).toContain(secret);
    }
  });

  it('shows a placeholder for a secret that the page does not have', () => {
    expect(runCommandOf('docker', { ...target, secret: null })).toContain(
      '--app-secret <APP_SECRET>',
    );
  });
});

describe('hostPortOf', () => {
  it('takes the port of the page, else the default of its scheme', () => {
    expect(hostPortOf('http://127.0.0.1:8081')).toBe('8081');
    expect(hostPortOf('https://app.scylla-ops.com')).toBe('443');
    expect(hostPortOf('http://example.com')).toBe('80');
  });
});
