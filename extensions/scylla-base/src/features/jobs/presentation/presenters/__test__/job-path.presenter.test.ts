// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type {
  JobNode,
  JobNodeExecution,
  NodeExecutionState,
} from '@base/features/jobs/domain/entities/job.entity.ts';
import { jobPath, needKey } from '../job-path.presenter.ts';

/** `is-main:true` is a need on the port `true` of `is-main`. */
const node = (id: string, deps: string[] = [], kind: JobNode['kind'] = 'run'): JobNode => ({
  id,
  kind,
  deps: deps.map(text => {
    const [source, port] = text.split(':');
    return port ? { node: source, port } : { node: source };
  }),
  ports: kind === 'switch' ? ['true', 'false'] : [],
});
const run = (id: string, state: NodeExecutionState, ports: string[] = []): JobNodeExecution => ({
  id,
  state,
  attempts: 1,
  maxAttempts: 1,
  ports,
});

describe('jobPath', () => {
  // `deploy` needs `build` and `is-main:true`; `cleanup` needs `is-main:false`.
  const ifElse = [
    node('build'),
    node('is-main', ['build'], 'switch'),
    node('deploy', ['build', 'is-main:true']),
    node('cleanup', ['is-main:false']),
  ];

  it('opens the port that the switch chose and closes the other, so the other side is not taken', () => {
    const path = jobPath(ifElse, [
      run('build', 'completed'),
      run('is-main', 'completed', ['false']),
      run('deploy', 'skipped'),
      run('cleanup', 'completed'),
    ]);

    expect(path.needs.get(needKey('deploy', { node: 'is-main', port: 'true' }))).toBe('closed');
    expect(path.needs.get(needKey('deploy', { node: 'build' }))).toBe('open');
    expect(path.needs.get(needKey('cleanup', { node: 'is-main', port: 'false' }))).toBe('open');
    expect(path.skipped.get('deploy')).toBe('not-taken');
  });

  it('says that a failure stopped a node whose needs could not open', () => {
    const path = jobPath(ifElse, [
      run('build', 'failed'),
      run('is-main', 'skipped'),
      run('deploy', 'skipped'),
      run('cleanup', 'skipped'),
    ]);

    expect(path.skipped.get('is-main')).toBe('stopped');
    expect(path.skipped.get('deploy')).toBe('stopped');
    expect(path.skipped.get('cleanup')).toBe('stopped');
  });

  it('says that a failure stopped a node whose needs were open', () => {
    const path = jobPath(
      [node('a'), node('b', ['a']), node('c')],
      [run('a', 'completed'), run('b', 'skipped'), run('c', 'failed')],
    );
    expect(path.skipped.get('b')).toBe('stopped');
  });

  it('leaves each node after a switch with no match not taken', () => {
    const path = jobPath(
      [node('pick', [], 'switch'), node('a', ['pick:true']), node('b', ['a'])],
      [run('pick', 'completed', []), run('a', 'skipped'), run('b', 'skipped')],
    );
    expect(path.skipped.get('a')).toBe('not-taken');
    expect(path.skipped.get('b')).toBe('not-taken');
  });

  it('opens the error port of a node that failed, and names the nodes of its error branch', () => {
    const path = jobPath(
      [node('test'), node('notify', ['test:error']), node('deploy', ['test'])],
      [run('test', 'failed'), run('notify', 'completed'), run('deploy', 'skipped')],
    );

    expect(path.needs.get(needKey('notify', { node: 'test', port: 'error' }))).toBe('open');
    expect(path.needs.get(needKey('deploy', { node: 'test' }))).toBe('closed');
    expect(path.errorBranches).toEqual(new Map([['test', ['notify']]]));
    expect(path.skipped.get('deploy')).toBe('stopped');
  });

  it('closes the error port of a node that completed: its error branch is not taken', () => {
    const path = jobPath(
      [node('test'), node('notify', ['test:error'])],
      [run('test', 'completed'), run('notify', 'skipped')],
    );
    expect(path.skipped.get('notify')).toBe('not-taken');
    expect(path.errorBranches.size).toBe(0);
  });

  it('calls a merge whose needs are all closed not taken, and takes one with a need open', () => {
    const nodes = [
      node('is-main', [], 'switch'),
      node('a', ['is-main:true']),
      node('b', ['is-main:true']),
      node('join', ['a', 'b'], 'merge'),
    ];
    const path = jobPath(nodes, [
      run('is-main', 'completed', ['false']),
      run('a', 'skipped'),
      run('b', 'skipped'),
      run('join', 'skipped'),
    ]);
    expect(path.skipped.get('join')).toBe('not-taken');
  });

  it('takes a merge on test and test:error after test, whatever its end', () => {
    const always = [node('test'), node('always', ['test', 'test:error'], 'merge')];
    for (const end of ['completed', 'failed'] as const) {
      const path = jobPath(always, [run('test', end), run('always', 'completed')]);
      const states = always[1].deps.map(need => path.needs.get(needKey('always', need)));
      expect(states.filter(state => state === 'open')).toHaveLength(1);
    }
  });

  it('opens no port of a cancelled node, and waits on a node that runs or has an unknown state', () => {
    const nodes = [node('a'), node('b', ['a:error']), node('c'), node('d', ['c'])];
    const path = jobPath(nodes, [run('a', 'cancelled'), run('c', 'unknown')]);
    expect(path.needs.get(needKey('b', { node: 'a', port: 'error' }))).toBe('closed');
    expect(path.needs.get(needKey('d', { node: 'c' }))).toBe('waiting');
  });

  it('draws a job with no snapshot node, or no run, with no crash', () => {
    expect(jobPath([], [run('a', 'completed')]).needs.size).toBe(0);
    expect(jobPath([node('a'), node('b', ['a'])], []).needs.get(needKey('b', { node: 'a' }))).toBe(
      'waiting',
    );
  });
});
