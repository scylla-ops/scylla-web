// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { dataExportFile } from '../data-export.presenter.ts';

const at = '2026-11-20T14:05:00.000Z';

describe('dataExportFile', () => {
  it('names the file after the UTC day of the copy', () => {
    expect(dataExportFile({ json: '{}', exportedAt: at }).name).toBe(
      'scylla-account-data-2026-11-20.json',
    );
  });

  it('gives the size of the text in UTF-8 bytes, in kB, or in MB from 1 MB', () => {
    expect(dataExportFile({ json: 'é'.repeat(250), exportedAt: at }).size).toBe('0.5 kB');
    expect(dataExportFile({ json: 'a'.repeat(1_500), exportedAt: at }).size).toBe('1.5 kB');
    expect(dataExportFile({ json: 'a'.repeat(2_400_000), exportedAt: at }).size).toBe('2.4 MB');
  });
});
