import { msg } from '@lingui/core/macro';

export const newProjectMessages = {
  step: (step: number) => msg`New project · Linked to GitHub · Step ${step} of 2`,
  pickTitle: msg`Pick a repository`,
  nameTitle: msg`Name the project`,
  nameDescription: msg`The name comes from the repository. The source and the reports keep their defaults: change them now or later in Settings.`,

  noMatchHint: msg`Not in the list? Add the repository to the installation on GitHub. The list updates when you come back to this tab.`,
  notConnectedTitle: msg`GitHub is not connected`,
  notConnectedBody: msg`Install the Scylla App on your GitHub account or organization. After the installation, you come back to this step.`,
  cannotLink: msg`You cannot link a repository in this workspace.`,

  repositoryDetails: (details: string, connection: string) => msg`${details} · ${connection}`,
  change: msg`Change`,
  projectName: msg`Project name`,
  fromRepository: msg`From the name of the repository.`,
  description: msg`Description`,
  descriptionPlaceholder: msg`e.g., A short description of the project`,
  reportsBody: msg`A check run on each commit and pull request: the nodes, the durations, the last log lines, Re-run.`,

  back: msg`Back`,
  continue: msg`Continue`,
  create: msg`Create project`,
  retry: msg`Try again`,
  setupFailed: msg`The project is created, but its setup is not complete.`,
  openSettings: msg`Open the project settings`,
};
