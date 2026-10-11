import { describe, it, expect, beforeEach } from 'vitest';
import { DefaultOnboardingRepository } from '../default-onboarding.repository.ts';

beforeEach(() => localStorage.clear());

describe('DefaultOnboardingRepository', () => {
  it('keeps the progress of each user apart', async () => {
    const repository = new DefaultOnboardingRepository();

    (await repository.saveStatus('ada', { kind: 'skipped' })).unwrap();

    expect((await repository.getStatus('ada')).unwrap()).toEqual({ kind: 'skipped' });
    expect((await repository.getStatus('grace')).unwrap()).toEqual({ kind: 'not-started' });
  });

  it('resumes a tour in progress at its step', async () => {
    const repository = new DefaultOnboardingRepository();
    const status = { kind: 'in-progress', step: 'copy-secret' } as const;

    (await repository.saveStatus('ada', status)).unwrap();

    expect((await repository.getStatus('ada')).unwrap()).toEqual(status);
  });

  it('reports a storage that refuses the write instead of throwing', async () => {
    const full = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    const repository = new DefaultOnboardingRepository(() => full);

    const result = await repository.saveStatus('ada', { kind: 'completed' });

    expect(() => result.unwrap()).toThrow('Failed to save the onboarding progress');
  });
});
