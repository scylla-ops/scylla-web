// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { summarizeStep } from '../step-summary.ts';

describe('summarizeStep', () => {
  it('shows the first line of a script that is not blank', () => {
    expect(
      summarizeStep({
        id: 'a',
        deps: [],
        kind: 'script',
        shell: 'bash',
        script: '\n  \n  npm ci\nnpm test',
        env: [],
      }),
    ).toEqual({ preview: 'npm ci', isEmpty: false, tag: 'bash' });
  });

  it('marks a script with nothing to run', () => {
    expect(
      summarizeStep({ id: 'a', deps: [], kind: 'script', shell: 'sh', script: '   \n', env: [] })
        .isEmpty,
    ).toBe(true);
  });

  it('shows a command with its arguments', () => {
    expect(
      summarizeStep({
        id: 'a',
        deps: [],
        kind: 'exec',
        command: 'docker',
        args: ['build', '.'],
        env: [],
      }),
    ).toEqual({ preview: 'docker build .', isEmpty: false, tag: 'exec' });
  });

  it('marks a command without a program, even with arguments', () => {
    expect(
      summarizeStep({ id: 'a', deps: [], kind: 'exec', command: ' ', args: ['build'], env: [] })
        .isEmpty,
    ).toBe(true);
  });
});
