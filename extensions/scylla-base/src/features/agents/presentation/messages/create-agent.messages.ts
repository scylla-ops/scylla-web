import { msg } from '@lingui/core/macro';

export const createAgentMessages = {
  title: msg`New agent`,
  description: msg`An agent is a machine that takes the jobs of this organization and runs them.`,
  startTitle: (name: string) => msg`Start ${name}`,
  startDescription: msg`Run the agent on the machine. It connects to Scylla, then waits for jobs.`,

  steps: msg`Steps`,
  stepNameAndAccess: msg`Name and access`,
  stepStart: msg`Start the agent`,

  name: msg`Name`,
  namePlaceholder: msg`build-runner-02`,
  nameHelp: msg`Unique in this organization. Use the machine name, so you find it in the list.`,
  nameInvalid: msg`Use letters, digits and dashes, 64 at most, and start with a letter or a digit.`,
  where: msg`Where it takes jobs`,
  oneProject: msg`One project`,
  recommended: msg`Recommended`,
  oneProjectText: msg`It takes the jobs of one project only, and reads only the secrets of that project.`,
  project: msg`Project`,
  projectsLoading: msg`Loading the projects…`,
  projectsLoadError: msg`Scylla could not load the projects.`,
  retry: msg`Retry`,
  allProjectsOf: (organization: string) => msg`All projects of ${organization}`,
  allProjectsText: msg`It takes the jobs of every project, and reads the secrets of every project.`,

  cancel: msg`Cancel`,
  create: msg`Create agent`,
  creating: msg`Creating…`,
  created: msg`Created`,

  secret: msg`Secret`,
  secretCopied: msg`Secret copied`,
  secretHelp: msg`Scylla keeps only a hash. If you lose it, reset the secret on the agent page.`,
  grantFailedTitle: msg`It can take the jobs of every project`,
  grantFailedBody: msg`Scylla could not limit it to one project. Fix its access in the Access card of the agent page.`,

  waiting: msg`Waiting for the first connection…`,
  waitingHelp: msg`Keep this window open: the agent shows here when it connects.`,
  connected: msg`Connected`,
  connectedFrom: (hostname: string) => msg`Connected from ${hostname}`,
  agentVersion: (version: string) => msg`agent ${version}`,
  waitsForJobs: msg`It waits for jobs.`,
  hostWaitsForJobs: (host: string) => msg`${host}. It waits for jobs.`,
  openAgent: msg`Open agent`,
};
