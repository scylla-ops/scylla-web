import { msg } from '@lingui/core/macro';

export const projectMessages = {
  noWorkspace: msg`No workspace selected`,
  noWorkspaceHint: msg`Select a workspace from the sidebar to view its projects`,
  loadError: msg`Unable to load projects`,

  project: msg`Project`,
  projects: msg`Projects`,
  newProject: msg`New project`,
  createDenied: msg`You don't have permission to create projects.`,
  deleteDenied: msg`You don't have permission to delete projects.`,

  edit: msg`Edit`,
  select: msg`Select`,
  noDescription: msg`No description`,

  projectName: msg`Project name`,
  projectNamePlaceholder: msg`e.g., My project`,
  description: msg`Description`,
  descriptionPlaceholder: msg`e.g., A short description of the project`,
  addDescription: msg`Add a description...`,
  createSubmit: msg`Create project`,
  editTitle: msg`Edit project`,
  editDescription: msg`Update the project name and description.`,
  save: msg`Save`,
  saving: msg`Saving...`,

  newProjectDescription: msg`Choose how the pipelines of the project start. You can link a repository later to a regular project.`,
  regularTitle: msg`Regular project`,
  regularBody: msg`Draw the pipelines in the Scylla editor. Run them by hand, on a schedule or on a webhook.`,
  regularAction: msg`Start a regular project`,
  githubTitle: msg`Project linked to GitHub`,
  githubBody: msg`Pick a repository. Its pipelines run on its commits, and Scylla reports the results on GitHub.`,
  githubAction: msg`Link a GitHub repository`,
  cannotLink: msg`You cannot link a repository in this workspace.`,

  regularStep: msg`New project · Regular project`,
  nameTitle: msg`Name the project`,
  regularDescription: msg`Draw its pipelines in the Scylla editor. Link a repository later in Settings.`,
  back: msg`Back`,
};
