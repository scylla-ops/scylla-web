import { msg } from '@lingui/core/macro';

export const agentWidgetMessages = {
  online: msg({ context: 'agent widget', message: 'online' }),
  offline: msg({ context: 'agent widget', message: 'offline' }),
  jobsOf: (busy: number, slots: number) => msg({ context: 'agent widget', message: `${busy} of ${slots} jobs` }),
  slotsOf: (busy: number, slots: number) => msg({ context: 'agent widget', message: `${busy} of ${slots} slots` }),
  seenNow: msg({ context: 'agent widget', message: 'seen now' }),
  offlineFor: (time: string) => msg({ context: 'agent widget', message: `offline for ${time}` }),
  cpu: msg({ context: 'agent widget', message: 'CPU' }),
  ram: msg({ context: 'agent widget', message: 'RAM' }),
  cpuDay: msg({ context: 'agent widget', message: 'CPU · 24 h' }),
  ramDay: msg({ context: 'agent widget', message: 'RAM · 24 h' }),
  cpuCount: (count: number) => msg({ context: 'agent widget', message: `${count} CPU` }),
  running: msg({ context: 'agent widget', message: 'Running' }),
  nowRunning: (busy: number, slots: number) =>
    msg({ context: 'agent widget', message: `Now running · ${busy} of ${slots} slots` }),
  nothingRuns: msg({ context: 'agent widget', message: 'No job runs' }),
  attempt: (step: string, attempt: number, max: number) =>
    msg({ context: 'agent widget', message: `${step} · attempt ${attempt} of ${max}` }),
  jobsIn: (period: string) => msg({ context: 'agent widget', message: `jobs · ${period}` }),
  success: msg({ context: 'agent widget', message: 'success' }),
  median: msg({ context: 'agent widget', message: 'median' }),
  p95: msg({ context: 'agent widget', message: 'p95' }),
  recentJobs: msg({ context: 'agent widget', message: 'Recent jobs' }),
  recent: msg({ context: 'agent widget', message: 'Recent' }),
  openAgent: msg({ context: 'agent widget', message: 'Open agent' }),
  noSample: msg({ context: 'agent widget', message: 'No sample in the last 24 hours' }),
  noTarget: msg({ context: 'agent widget', message: 'No agent chosen' }),
  noTargetText: msg({ context: 'agent widget', message: 'Edit the dashboard and choose an agent in Data.' }),
  gone: msg({ context: 'agent widget', message: 'This agent is gone' }),
  goneText: msg({
    context: 'agent widget',
    message: 'It was deleted, or you cannot see it. Choose another agent in Data.',
  }),
};
