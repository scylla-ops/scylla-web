import { msg } from '@lingui/core/macro';

/** The texts of "Capacity". */
export const capacityMessages = {
  title: msg({ context: 'capacity', message: 'Capacity' }),
  agents: msg({ context: 'capacity', message: 'agents' }),
  agentsOf: (online: number, total: number) => msg({ context: 'capacity', message: `${online} of ${total} agents` }),
  onlineOf: (online: number, total: number) => msg({ context: 'capacity', message: `${online} of ${total} online` }),
  slotsBusy: msg({ context: 'capacity', message: 'slots busy' }),
  ofSlotsBusy: (slots: number) => msg({ context: 'capacity', message: `of ${slots} slots busy` }),
  agentsOnline: msg({ context: 'capacity', message: 'agents online' }),
  waitP50: msg({ context: 'capacity', message: 'wait for an agent (p50)' }),
  agent: msg({ context: 'capacity', message: 'Agent' }),
  slots: msg({ context: 'capacity', message: 'Slots' }),
  cpu: msg({ context: 'capacity', message: 'CPU' }),
  ram: msg({ context: 'capacity', message: 'RAM' }),
  cpuCount: (count: number) => msg({ context: 'capacity', message: `${count} CPU` }),
  noRuntime: msg({ context: 'capacity', message: 'no container runtime' }),
  offlineFor: (time: string) => msg({ context: 'capacity', message: `offline for ${time}` }),
  busyLastDay: msg({ context: 'capacity', message: 'Busy slots · last 24 h' }),
  averagePerHour: (capacity: number) =>
    msg({ context: 'capacity', message: `average per hour · capacity ${capacity}` }),
  noAgent: msg({ context: 'capacity', message: 'No agent' }),
};
