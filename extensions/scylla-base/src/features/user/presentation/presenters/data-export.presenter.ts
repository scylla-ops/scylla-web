import { i18n } from '@lingui/core';
import type { AccountDataExport } from '@base/features/user/domain/entities/user.entity.ts';

/** What the panel of the export shows of a copy, and the name of its file. */
export interface DataExportFile {
  /** `scylla-account-data-<UTC day of the copy>.json`. */
  name: string;
  /** The size of the file in the locale of the app: "0.5 kB", "1.2 kB", "2.4 MB". */
  size: string;
}

const KILOBYTE = 1000;
const MEGABYTE = 1000 * KILOBYTE;

/** A number of bytes in kB, or in MB from 1 MB. A copy is never under 1 kB in practice. */
const sizeOf = (bytes: number): string => {
  const [value, unit] =
    bytes >= MEGABYTE ? [bytes / MEGABYTE, 'megabyte'] : [bytes / KILOBYTE, 'kilobyte'];
  return new Intl.NumberFormat(i18n.locale || 'en', {
    style: 'unit',
    unit,
    unitDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(value);
};

/** The name and the size of the file of a copy of the account data. */
export const dataExportFile = (copy: AccountDataExport): DataExportFile => ({
  name: `scylla-account-data-${copy.exportedAt.slice(0, 10)}.json`,
  size: sizeOf(new TextEncoder().encode(copy.json).length),
});
