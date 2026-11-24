import { msg } from '@lingui/core/macro';

export const mergeBlockMessages = {
  title: msg`Block the merge`,
  gitHubDescription: (repository: string) =>
    msg`Scylla keeps one ruleset "Scylla required checks" on the default branch of ${repository}.`,
  gitLabDescription: (repository: string) =>
    msg`Scylla turns on "Pipelines must succeed" in ${repository}. One rule for all the Scylla pipelines of the project.`,
  noPipeline: msg`No pipeline yet. Each pipeline gets its rule here.`,
  readFailed: msg`Scylla cannot read the rules now.`,

  gitHubRule: (branch: string, context: string) =>
    msg`Block the merge into ${branch} when ${context} fails`,
  gitLabRule: msg`Block the merge when a Scylla pipeline fails`,

  offGitHub: (context: string) => msg`A failure of ${context} does not block the merge.`,
  offGitLab: msg`A failed Scylla pipeline does not block the merge.`,

  requiredOn: (branch: string) => msg`Required on ${branch}`,
  onGitHub: (repository: string) => msg`Ruleset "Scylla required checks" on ${repository}.`,
  onGitLab: (repository: string) => msg`"Pipelines must succeed" is on in ${repository}.`,
  viewOn: (provider: string) => msg`View on ${provider}`,

  updating: (provider: string) => msg`Updating ${provider}…`,

  permissionNeeded: msg`Permission needed`,
  permissionMissing: (account: string) =>
    msg`The installation on ${account} did not accept the new permission Administration: write.`,
  grantOnGitHub: msg`Grant the permission on GitHub`,
  roleOnGitLab: msg`Give the Maintainer role on GitLab`,
  byHand: msg`Do it by hand`,
  copyContext: (context: string) => msg`Copy ${context}`,
  gitHubStep1: (repository: string) =>
    msg`On GitHub, open ${repository} › Settings › Rules › Rulesets › New branch ruleset.`,
  gitHubStep2: (branch: string) => msg`Target the default branch (${branch}), enforcement Active.`,
  gitHubStep3: msg`Add "Require status checks to pass" with this check, source "Scylla":`,
  gitLabStep1: (repository: string) =>
    msg`On GitLab, open ${repository} › Settings › Merge requests.`,
  gitLabStep2: msg`Under Merge checks, select "Pipelines must succeed".`,
  gitLabStep3: msg`Save the changes.`,

  notAvailable: msg`Not available`,
  privateNotAllowed: msg`GitHub Free does not allow rules on private repositories.`,
  notAllowed: (provider: string) => msg`${provider} does not allow this rule on this repository.`,

  outOfSync: msg`Out of sync`,
  changedOnProvider: (provider: string) => msg`Someone changed the rule on ${provider}.`,
  applyAgain: msg`Apply again`,

  notApplied: msg`Not applied`,
  providerLimit: (provider: string) => msg`${provider} limit reached. Try again in some minutes.`,
  providerRefused: (provider: string) =>
    msg`${provider} refused the change. Check the connection in Integrations.`,
  providerUnavailable: (provider: string) => msg`${provider} did not answer.`,
  repositoryNotActive: msg`The repository cannot be used now. Repair the link first.`,
  notChanged: (provider: string) => msg`The rule did not change on ${provider}.`,
  tryAgain: msg`Try again`,
};
