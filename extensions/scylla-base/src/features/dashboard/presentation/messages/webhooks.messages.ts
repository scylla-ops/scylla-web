import { msg } from '@lingui/core/macro';

/** The texts of "Webhooks". */
export const webhookMessages = {
  title: msg({ context: 'webhooks', message: 'Webhooks' }),
  hours24: msg({ context: 'webhooks', message: '24 h' }),
  failedCount: (count: number) => msg({ context: 'webhooks', message: `${count} failed` }),
  delivered: msg({ context: 'webhooks', message: 'delivered' }),
  deliveredIn24h: msg({ context: 'webhooks', message: 'delivered in 24 h' }),
  failed: msg({ context: 'webhooks', message: 'failed' }),
  deliveredLegend: msg({ context: 'webhooks legend', message: 'Delivered' }),
  failedLegend: msg({ context: 'webhooks legend', message: 'Failed' }),
  repositories: (account: string, count: number) =>
    msg({ context: 'webhooks', message: `${account} · ${count} repositories` }),
  webhookTrigger: (pipeline: string) => msg({ context: 'webhooks', message: `webhook trigger · ${pipeline}` }),
  lastDelivery: (time: string, event: string, where: string) =>
    msg({ context: 'webhooks', message: `Last delivery ${time} · ${event} on ${where}` }),
  lastDeliveryShort: (time: string) => msg({ context: 'webhooks', message: `Last delivery ${time}` }),
  perHour: msg({ context: 'webhooks', message: 'Deliveries per hour' }),
  manage: msg({ context: 'webhooks', message: 'Manage' }),
  nothing: msg({ context: 'webhooks', message: 'No connection' }),
  nothingText: msg({ context: 'webhooks', message: 'Connect GitHub or GitLab, or add a webhook trigger, to see the deliveries here.' }),
  catalogHint: msg({ context: 'webhooks', message: 'The deliveries of 24 h and the failures' }),
};
