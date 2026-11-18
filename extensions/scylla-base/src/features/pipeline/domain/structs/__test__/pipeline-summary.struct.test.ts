// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { recentSuccessRate } from '../pipeline-summary.struct.ts';

describe('recentSuccessRate', () => {
  it('divides the completed jobs by the ended jobs', () => {
    expect(recentSuccessRate({ completed: 17, failed: 3 })).toBe(0.85);
  });

  it('gives null when no recent job ended', () => {
    expect(recentSuccessRate({ completed: 0, failed: 0 })).toBeNull();
  });
});
