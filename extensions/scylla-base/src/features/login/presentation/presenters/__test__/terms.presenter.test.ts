import { describe, it, expect } from 'vitest';
import { changeItems } from '../terms.presenter.ts';

describe('changeItems', () => {
  it('gives one item for each line that is not empty, with no list mark', () => {
    expect(
      changeItems('- Export of your data.\r\n\n  * Clearer rules.\n• The DPA.\n+ Quotas'),
    ).toEqual(['Export of your data.', 'Clearer rules.', 'The DPA.', 'Quotas']);
  });

  it('keeps a dash that is part of the text, and gives no item for an empty text', () => {
    expect(changeItems('-5% on the runners\n2026-11 rules')).toEqual([
      '-5% on the runners',
      '2026-11 rules',
    ]);
    expect(changeItems(' \n ')).toEqual([]);
  });
});
