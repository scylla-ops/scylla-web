/** The node of the log in the URL: `?node=build`, or `?node=all` for the whole job. */
export const NODE_PARAM = 'node';
export const ALL_NODES = 'all';
/** The old links opened several panels: `?nodes=build,test`. The page opens the first one. */
export const LEGACY_NODES_PARAM = 'nodes';
/** `?fullscreen=1`: the log fills the window. */
export const FULLSCREEN_PARAM = 'fullscreen';

/** What the URL of the job page tells about its log. */
export interface JobLogPlace {
  /** The node of the log, or `null` for the whole job. */
  nodeId: string | null;
  fullscreen: boolean;
}

/**
 * Reads the log of the job page from its query string. `nodeIds` are the nodes of the list, in
 * order. A node that the job does not have gives the whole job; an old `?nodes=` link gives the
 * first of its nodes in the order of the list.
 */
export const readJobLogPlace = (search: string, nodeIds: readonly string[]): JobLogPlace => {
  const params = new URLSearchParams(search.split('#')[0]);
  const fullscreen = params.get(FULLSCREEN_PARAM) === '1';
  const node = params.get(NODE_PARAM);

  if (node !== null) {
    return { nodeId: nodeIds.includes(node) ? node : null, fullscreen };
  }

  const legacy = (params.get(LEGACY_NODES_PARAM) ?? '').split(',');
  return { nodeId: nodeIds.find(id => legacy.includes(id)) ?? null, fullscreen };
};

/**
 * The query string after a change of the log: the node (`null` for the whole job) and the full
 * screen. The other parameters stay, an old `nodes` goes. With its leading `?`, or empty.
 */
export const jobLogSearch = (
  search: string,
  change: { nodeId?: string | null; fullscreen?: boolean },
): string => {
  const params = new URLSearchParams(search);

  if (change.nodeId !== undefined) {
    params.delete(LEGACY_NODES_PARAM);
    params.set(NODE_PARAM, change.nodeId ?? ALL_NODES);
  }
  if (change.fullscreen !== undefined) {
    if (change.fullscreen) params.set(FULLSCREEN_PARAM, '1');
    else params.delete(FULLSCREEN_PARAM);
  }

  const query = params.toString();
  return query ? `?${query}` : '';
};
