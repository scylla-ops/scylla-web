import { msg } from '@lingui/core/macro';

export const pipelineWidgetMessages = {
  lastRun: (id: string, outcome: string, ago: string) =>
    msg({ context: 'pipeline widget', message: `Last run ${id} · ${outcome} ${ago} ago` }),
  noRun: msg({ context: 'pipeline widget', message: 'No run yet' }),
  completed: msg({ context: 'pipeline widget', message: 'completed' }),
  failed: msg({ context: 'pipeline widget', message: 'failed' }),
  cancelled: msg({ context: 'pipeline widget', message: 'cancelled' }),
  orphaned: msg({ context: 'pipeline widget', message: 'orphaned' }),
  successLastRuns: (runs: number) => msg({ context: 'pipeline widget', message: `success · last ${runs} runs` }),
  medianOf: (duration: string) => msg({ context: 'pipeline widget', message: `median ${duration}` }),
  onTrigger: (trigger: string) => msg({ context: 'pipeline widget', message: `on ${trigger}` }),
  success: msg({ context: 'pipeline widget', message: 'success' }),
  median: msg({ context: 'pipeline widget', message: 'median' }),
  runsIn: (period: string) => msg({ context: 'pipeline widget', message: `runs · ${period}` }),
  sinceLastRun: msg({ context: 'pipeline widget', message: 'since last run' }),
  lastRuns: (runs: number) => msg({ context: 'pipeline widget', message: `Last ${runs} runs` }),
  recentRuns: msg({ context: 'pipeline widget', message: 'Recent runs' }),
  run: msg({ context: 'pipeline widget', message: 'Run' }),
  runNow: msg({ context: 'pipeline widget', message: 'Run the pipeline now' }),
  noTarget: msg({ context: 'pipeline widget', message: 'No pipeline chosen' }),
  noTargetText: msg({ context: 'pipeline widget', message: 'Edit the dashboard and choose a pipeline in Data.' }),
  gone: msg({ context: 'pipeline widget', message: 'This pipeline is gone' }),
  goneText: msg({
    context: 'pipeline widget',
    message: 'It was deleted, or you cannot see it. Choose another pipeline in Data.',
  }),
};
