import { msg } from '@lingui/core/macro';

export const agentRunCommandMessages = {
  address: msg`Scylla address`,
  addressHelp: (port: string) =>
    msg`Filled in from this page. From a Docker container on this machine, use http://host.docker.internal:${port}.`,
  method: msg`How to run the agent`,
  fromSource: msg`From source`,
  runOnMachine: msg`Run on the agent machine`,
  commandCopied: msg`Command copied`,
};
