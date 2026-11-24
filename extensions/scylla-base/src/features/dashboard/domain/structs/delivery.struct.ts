/** The deliveries of a connection or of a webhook trigger in the last 24 hours. */
export interface DeliverySource {
  id: string;
  /** github or gitlab for a connection, webhook for a trigger. */
  provider: string;
  /** The account of a connection: acme. Empty for a trigger. */
  account: string;
  repositoryCount: number;
  delivered: number;
  failed: number;
  lastReceivedAt: string;
  lastEvent: string;
  lastRepository: string;
  lastRef: string;
}

export interface DeliveryHour {
  start: string;
  delivered: number;
  failed: number;
}

/** The webhook deliveries of a workspace (VcsConnectionService.GetDeliveryStats). */
export interface DeliveryStats {
  delivered: number;
  failed: number;
  connections: DeliverySource[];
  /** The webhook triggers, with their names. */
  triggers: (DeliverySource & { name: string; pipelineName: string })[];
  hours: DeliveryHour[];
}
