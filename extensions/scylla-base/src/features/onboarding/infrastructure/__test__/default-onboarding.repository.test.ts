import { describe, it, expect, beforeEach } from 'vitest';
import { DefaultOnboardingRepository } from '../default-onboarding.repository.ts';

beforeEach(() => localStorage.clear());

describe('DefaultOnboardingRepository', () => {
  it('keeps the progress of each user apart', async () => {
    const repository = new DefaultOnboardingRepository();

    await repository.saveStatus('ada', { kind: 'skipped' });

    expect(await repository.getStatus('ada')).toEqual({ kind: 'skipped' });
    expect(await repository.getStatus('grace')).toEqual({ kind: 'not-started' });
  });

  it('resumes a tour in progress at its step', async () => {
    const repository = new DefaultOnboardingRepository();
    const status = { kind: 'in-progress', step: 'copy-secret' } as const;

    await repository.saveStatus('ada', status);

    expect(await repository.getStatus('ada')).toEqual(status);
  });

  it('rejects when the storage refuses the write, instead of throwing in the caller', async () => {
    const full = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    const repository = new DefaultOnboardingRepository(() => full);

    await expect(repository.saveStatus('ada', { kind: 'completed' })).rejects.toThrow(
      'QuotaExceededError',
    );
  });
});
