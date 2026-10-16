import { msg } from '@lingui/core/macro';

export const accessCardMessages = {
  access: msg`Access`,
  whereItTakesJobs: msg`Where this agent takes jobs`,
  addAccess: msg`Add access`,
  everyProjectAlready: msg`It already takes the jobs of every project.`,
  scopeProject: msg`Project`,
  scopeOrganization: msg`Organization`,
  scopeSystem: msg`System`,
  allProjects: msg`All projects`,
  allProjectsOf: (organization: string) => msg`All projects of ${organization}`,
  allOrganizations: msg`All organizations`,
  removeAccessTo: (name: string, role: string) => msg`Remove access to ${name} (${role})`,
  projectOnly: (project: string) =>
    msg`It takes the jobs of ${project} only, and reads only the secrets of ${project}.`,
  projectsOnly: (count: number) =>
    msg`It takes the jobs of these ${count} projects only, and reads only their secrets.`,
  organizationWide: msg`It takes the jobs of every project of this organization.`,
  organizationWideOf: (organizations: string) =>
    msg`It takes the jobs of every project of ${organizations}.`,
  systemWide: msg`It takes the jobs of every organization.`,
  accessLoadError: msg`Scylla could not load the access of this agent.`,
  accessHidden: msg`You cannot see the access of this agent.`,
  retry: msg`Retry`,
  noAccess: msg`No access`,
  noAccessBody: msg`This agent takes no job. Give it one project or all the projects.`,

  giveTitle: (agent: string) => msg`Give access to ${agent}`,
  giveDescription: msg`The agent takes the jobs of the scope you choose, and reads its secrets.`,
  where: msg`Where it takes jobs`,
  oneProject: msg`One project`,
  oneProjectText: msg`It takes the jobs of this project only.`,
  projectsLoading: msg`Loading the projects…`,
  projectsLoadError: msg`Scylla could not load the projects.`,
  projectsDenied: msg`You cannot see the projects of this organization.`,
  noProjectLeft: msg`There is no project without access.`,
  projectsOutOfReach: msg`You cannot give access to the other projects.`,
  projectsCut: (count: number) => msg`The list shows the first ${count} projects only.`,
  organizationDenied: msg`You cannot give access to all the projects.`,
  allProjectsText: msg`It takes the jobs of every project, and reads the secrets of every project.`,
  replacesProjects: (projects: string) => msg`This access replaces the access to ${projects}.`,
  keepsProjects: (projects: string) => msg`The access to ${projects} stays: you cannot remove it.`,
  reconnectKeepsJobs: msg`The agent reconnects in a few seconds, and a job that it runs now continues.`,
  reconnectStrandsJobs: msg`The agent reconnects in a few seconds, and a job that it runs now under this access cannot report its result.`,
  roleProject: msg`Role: Project agent. It can take jobs and report their status, nothing more.`,
  roleOrganization: msg`Role: Organization agent. It can take the jobs of every project and report their status, nothing more.`,
  cancel: msg`Cancel`,
  give: msg`Give access`,
  giving: msg`Giving access…`,

  removeTitle: (name: string) => msg`Remove access to ${name}?`,
  removeOrganizationTitle: (organization: string) =>
    msg`Remove access to all projects of ${organization}?`,
  removeBody: (agent: string, project: string) =>
    msg`${agent} stops taking the jobs of ${project}, and stops reading its secrets.`,
  removeOrganizationBody: (agent: string, organization: string) =>
    msg`${agent} stops taking the jobs of every project of ${organization}, and stops reading their secrets.`,
  whatChanges: msg`What changes`,
  loses: msg`Loses`,
  keeps: msg`Keeps`,
  lastAccess: msg`It then takes no job.`,
  remove: msg`Remove access`,

  accessGiven: msg`Access given`,
  accessGivenProject: (agent: string, project: string) =>
    msg`${agent} can take the jobs of ${project}.`,
  accessGivenOrganization: (agent: string, organization: string) =>
    msg`${agent} can take the jobs of every project of ${organization}.`,
  replaceFailed: (agent: string, organization: string, projects: string) =>
    msg`${agent} can take the jobs of every project of ${organization}. Scylla could not remove the access to ${projects}: remove it in the Access card.`,
  accessRemoved: msg`Access removed`,
  accessRemovedProject: (agent: string, project: string) =>
    msg`${agent} no longer takes the jobs of ${project}.`,
  accessRemovedOrganization: (agent: string, organization: string) =>
    msg`${agent} no longer takes the jobs of every project of ${organization}.`,
};
