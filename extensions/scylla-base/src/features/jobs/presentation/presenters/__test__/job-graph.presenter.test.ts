// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { JobEntity, JobNode } from '@base/features/jobs/domain/entities/job.entity.ts';
import { JOB_NODE, jobGraph } from '../job-graph.presenter.ts';

const node = (id: string, deps: JobNode['deps'] = [], kind: JobNode['kind'] = 'run'): JobNode => ({
  id,
  kind,
  deps,
  ports: kind === 'switch' ? ['true', 'false'] : [],
});

const job = (nodes: JobNode[], executions: JobEntity['nodeExecutions'] = []): JobEntity => ({
  id: 'job-1',
  pipelineId: 'p',
  status: 'completed',
  nodes,
  nodeExecutions: executions,
  createdAt: '',
  updatedAt: '',
});

describe('jobGraph', () => {
  const nodes = [
    node('build'),
    node('is-main', [{ node: 'build' }], 'switch'),
    node('cleanup', [{ node: 'is-main', port: 'false' }]),
    node('deploy', [{ node: 'is-main', port: 'true' }]),
    node('notify', [{ node: 'build', port: 'error' }]),
  ];
  const ran = (state: 'completed' | 'skipped', id: string, ports: string[] = []) => ({
    id,
    state,
    attempts: 1,
    maxAttempts: 1,
    ports,
  });

  it('draws a closed edge grey and dashed, an open one solid, from the handle of its port', () => {
    const { edges } = jobGraph(
      job(nodes, [
        ran('completed', 'build'),
        ran('completed', 'is-main', ['false']),
        ran('completed', 'cleanup'),
        ran('skipped', 'deploy'),
        ran('skipped', 'notify'),
      ]),
    );
    const deploy = edges.find(edge => edge.target === 'deploy')!;
    const cleanup = edges.find(edge => edge.target === 'cleanup')!;

    expect(deploy).toMatchObject({ sourceHandle: 'true', data: { state: 'closed' } });
    expect(deploy.style).toContain('stroke-dasharray');
    expect(cleanup).toMatchObject({ sourceHandle: 'false', data: { state: 'open' } });
    expect(cleanup.style).not.toContain('stroke-dasharray');
  });

  it('marks the chosen ports of a switch, and shows the error port of a node that a need names', () => {
    const { nodes: flow } = jobGraph(job(nodes, [ran('completed', 'is-main', ['true'])]));
    const byId = Object.fromEntries(flow.map(flowNode => [flowNode.id, flowNode.data]));

    expect(byId['is-main'].outputs).toEqual([
      { port: 'true', chosen: true },
      { port: 'false', chosen: false },
    ]);
    expect(byId.build.outputs).toEqual([{}, { port: 'error', error: true }]);
    expect(byId.deploy.outputs).toEqual([{}]);
  });

  it('says why a skipped node did not run', () => {
    const { nodes: flow } = jobGraph(
      job(nodes, [
        ran('completed', 'build'),
        ran('completed', 'is-main', []),
        ran('skipped', 'deploy'),
      ]),
    );
    expect(flow.find(flowNode => flowNode.id === 'deploy')?.data.reason).toBe('not-taken');
  });

  it('lays out one column for each stage, with the targets of a switch in the order of its ports', () => {
    const { nodes: flow } = jobGraph(job(nodes));
    const at = Object.fromEntries(flow.map(flowNode => [flowNode.id, flowNode.position]));

    expect(at.build.x).toBeLessThan(at['is-main'].x);
    expect(at.deploy.x).toBe(at.cleanup.x);
    expect(at.deploy.y).toBeLessThan(at.cleanup.y);
  });

  it('draws 256 nodes, each in its own place', () => {
    const chain = Array.from({ length: 256 }, (_, i) =>
      node(`n${i}`, i % 16 === 0 ? [] : [{ node: `n${i - 1}` }]),
    );
    const { nodes: flow, edges } = jobGraph(job(chain));

    expect(flow).toHaveLength(256);
    expect(edges).toHaveLength(240);
    expect(new Set(flow.map(({ position }) => `${position.x},${position.y}`)).size).toBe(256);
    expect(Math.max(...flow.map(({ position }) => position.x))).toBe(15 * (JOB_NODE.width + 56));
  });

  it('draws a job with no snapshot node as an empty graph', () => {
    expect(jobGraph(job([]))).toEqual({ nodes: [], edges: [] });
  });
});
