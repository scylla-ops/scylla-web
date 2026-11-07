import type {
  JobNeed,
  JobNode,
  JobNodeExecution,
} from '@base/features/jobs/domain/entities/job.entity.ts';

/** The port of a node that runs a step: it opens when the node failed after its last attempt. */
export const ERROR_PORT = 'error';

/** `waiting`: the node of the need has not ended yet, or its state is unknown. */
export type NeedState = 'open' | 'closed' | 'waiting';

/**
 * Why a skipped node did not run. `not-taken`: a port that did not open, or a need on a node that
 * was not taken. `stopped`: another node failed.
 */
export type SkipReason = 'not-taken' | 'stopped';

export interface JobPath {
  /** The state of each need of each node, by `needKey`. */
  needs: Map<string, NeedState>;
  /** The reason of each skipped node. */
  skipped: Map<string, SkipReason>;
  /** Each failed node whose failure an `error` need took, and the nodes that need it so. */
  errorBranches: Map<string, string[]>;
}

/** `is-main:true->deploy`: the need of `deploy` on the port `true` of `is-main`. */
export const needKey = (target: string, { node, port }: JobNeed) =>
  `${node}:${port ?? ''}->${target}`;

const ENDED = new Set(['completed', 'failed', 'skipped', 'cancelled']);

/**
 * The path that the job took, with the run rule of the agent: a need with no port opens when its
 * node completed, a port of a switch when the switch chose it, `error` when the node failed after
 * its last attempt. A cancelled node opens nothing.
 */
export const jobPath = (nodes: JobNode[], executions: JobNodeExecution[]): JobPath => {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const runs = new Map(executions.map(execution => [execution.id, execution]));

  const stateOf = ({ node, port }: JobNeed): NeedState => {
    const source = byId.get(node);
    const run = runs.get(node);
    if (!source || !run || !ENDED.has(run.state)) return 'waiting';
    const opens =
      port === undefined
        ? run.state === 'completed'
        : source.kind === 'run' && port === ERROR_PORT
          ? run.state === 'failed'
          : run.state === 'completed' && run.ports.includes(port);
    return opens ? 'open' : 'closed';
  };

  const reasons = new Map<string, SkipReason>();
  const reasonOf = (id: string, seen: Set<string>): SkipReason => {
    const known = reasons.get(id);
    if (known) return known;
    const node = byId.get(id);
    // A loop, which the server refuses, ends here.
    if (!node || seen.has(id)) return 'stopped';
    seen.add(id);

    const states = node.deps.map(stateOf);
    const runsAfter =
      node.kind === 'merge' ? states.includes('open') : states.every(state => state === 'open');
    // Its needs let it run, or did not end: a failure stopped the job before it.
    const notTaken =
      !runsAfter &&
      !states.includes('waiting') &&
      node.deps.some((need, index) => states[index] === 'closed' && closedOnPath(need, seen));
    const reason = notTaken ? 'not-taken' : 'stopped';
    reasons.set(id, reason);
    return reason;
  };

  /** A port that its node, which ended well, did not open; or a need on a node not taken. */
  const closedOnPath = (need: JobNeed, seen: Set<string>): boolean => {
    const state = runs.get(need.node)?.state;
    if (state === 'skipped') return reasonOf(need.node, seen) === 'not-taken';
    return need.port !== undefined && state === 'completed';
  };

  const needs = new Map<string, NeedState>();
  const errorBranches = new Map<string, string[]>();
  for (const node of nodes) {
    for (const need of node.deps) {
      const state = stateOf(need);
      needs.set(needKey(node.id, need), state);
      if (need.port === ERROR_PORT && state === 'open')
        errorBranches.set(need.node, [...(errorBranches.get(need.node) ?? []), node.id]);
    }
  }

  const skipped = new Map<string, SkipReason>();
  for (const node of nodes)
    if (runs.get(node.id)?.state === 'skipped') skipped.set(node.id, reasonOf(node.id, new Set()));

  return { needs, skipped, errorBranches };
};
