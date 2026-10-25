import { msg } from '@lingui/core/macro';

export const scriptingMessages = {
  scriptView: msg`Script view`,
  byNode: msg`By node`,
  fullDocument: msg`Full document`,

  nodes: msg`Nodes`,
  newNode: msg`New node`,
  noNode: msg`This pipeline has no node yet.`,
  nodeIssue: msg`This node cannot run as it is.`,
  /** Beside the id of a command node, as the shell beside a script node. */
  commandShort: msg({ context: 'node-kind', message: 'cmd' }),
  stage: (number: number) => msg`Stage ${number}`,
  waitsFor: msg`Waits for`,
  nodeActions: (id: string) => msg`Actions of ${id}`,
  openToSide: msg`Open to the side`,
  dropHint: msg`Drop on a node to wait for it. Hold Alt to keep the other dependencies.`,
  dependenciesDropped: (id: string, deps: string) => msg`${id} no longer waits for ${deps}.`,
  nodeMoved: (id: string, target: string) =>
    msg`${id} now runs after ${target}. The nodes that waited for it wait for what it waited for.`,
  undo: msg`Undo`,

  openNodes: msg`Open nodes`,
  closeTab: (id: string) => msg`Close ${id}`,
  splitEditor: msg`Split the editor`,
  closePane: msg`Close the pane`,
  toggleNodeList: msg`Show or hide the nodes`,
  toggleNodeProperties: msg`Show or hide the node properties`,
  noNodeOpen: msg`Open a node from the list.`,
  copyNode: msg`Copy the node`,
  commandPreview: msg`The line that runs`,
  copyAll: msg`Copy all`,

  nodeProperties: msg`Node properties`,
  dependencies: msg`Dependencies`,
  addDependency: msg`Add a dependency`,
  removeDependency: (id: string) => msg`Remove the dependency on ${id}`,
  requiredBy: msg`Required by`,
};
