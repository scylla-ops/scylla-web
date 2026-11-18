// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { versionText } from '../version.ts';

describe('versionText', () => {
  it('gives the bare version for a release build only', () => {
    expect(versionText('0.7.0-rc.1', { SCYLLA_RELEASE: 'true', SCYLLA_BUILD: '240da00f' })).toBe(
      '0.7.0-rc.1',
    );
  });

  it('adds the first 7 characters of the commit to another build', () => {
    expect(versionText('0.7.0-rc.1', { SCYLLA_BUILD: '240da00f1c2b' })).toBe('0.7.0-rc.1+240da00');
  });

  it('adds dev to a build with no commit, as the dev server', () => {
    expect(versionText('0.7.0', {})).toBe('0.7.0+dev');
    expect(versionText('0.7.0', { SCYLLA_BUILD: '', SCYLLA_RELEASE: 'false' })).toBe('0.7.0+dev');
  });
});
