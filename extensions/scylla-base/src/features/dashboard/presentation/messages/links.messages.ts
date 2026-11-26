import { msg } from '@lingui/core/macro';

/** The tooltips of the links of the widgets: what a click opens. The buttons of an empty widget. */
export const linkMessages = {
  newPipeline: msg`New pipeline`,
  newProject: msg`New project`,
  openJob: msg({ context: 'widget link', message: 'Open the job' }),
  openJobs: msg({ context: 'widget link', message: 'Open the jobs of this pipeline' }),
  openTriggers: msg({ context: 'widget link', message: 'Open the triggers of this pipeline' }),
  openAgent: msg({ context: 'widget link', message: 'Open the agent' }),
  openAgents: msg({ context: 'widget link', message: 'Open the agents' }),
  openProject: msg({ context: 'widget link', message: 'Open the project' }),
  openIntegrations: msg({ context: 'widget link', message: 'Open the integrations' }),
  openNode: (node: string) =>
    msg({ context: 'widget link', message: `Open the logs of ${node} in the newest job` }),
  showDay: (day: string) =>
    msg({ context: 'widget link', message: `Show ${day} on the dashboard` }),
  showWeek: (day: string) =>
    msg({ context: 'widget link', message: `Show the week of ${day} on the dashboard` }),
};
