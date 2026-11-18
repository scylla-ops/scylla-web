/** The deliveries of a connection or of a webhook trigger in the last 24 hours. */
export interface DeliverySource {
  id: string;
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
