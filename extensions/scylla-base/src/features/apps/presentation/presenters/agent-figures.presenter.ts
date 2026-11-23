import { formatNumber } from '@scylla/ui/i18n';

const PERCENT = { style: 'percent', maximumFractionDigits: 0 } as const;

/** "95%", "95 %" in French. `null` (no ended job) gives a dash. */
export const percentText = (rate: number | null): string =>
  rate === null ? '–' : formatNumber(rate, PERCENT);

/** The memory of a machine in whole gigabytes: "24 GB", "24 Go" in French. */
export const memoryText = (totalMemoryMb: number): string =>
  formatNumber(Math.round(totalMemoryMb / 1024), {
    style: 'unit',
    unit: 'gigabyte',
    unitDisplay: 'short',
  });
