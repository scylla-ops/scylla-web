import { describe, it, expect, beforeEach } from 'vitest';
import { BrowserOnboardingLocalDataSource } from '../../data/browser-onboarding-local.data-source.ts';
import type { OnboardingLocalDataSource } from '../data-sources/onboarding-local.data-source.ts';
import { DefaultOnboardingRepository } from '../default-onboarding.repository.ts';

beforeEach(() => localStorage.clear());

describe('DefaultOnboardingRepository', () => {
  it('keeps the progress of each user apart', async () => {
    const repository = new DefaultOnboardingRepository(new BrowserOnboardingLocalDataSource());

    (await repository.saveStatus('ada', { kind: 'skipped' })).unwrap();

    expect((await repository.getStatus('ada')).unwrap()).toEqual({ kind: 'skipped' });
    expect((await repository.getStatus('grace')).unwrap()).toEqual({ kind: 'not-started' });
  });

  it('resumes a tour in progress at its step', async () => {
    const repository = new DefaultOnboardingRepository(new BrowserOnboardingLocalDataSource());
    const status = { kind: 'in-progress', step: 'copy-secret' } as const;

    (await repository.saveStatus('ada', status)).unwrap();

    expect((await repository.getStatus('ada')).unwrap()).toEqual(status);
  });

  it('reports a storage that refuses the write instead of throwing', async () => {
    const full: OnboardingLocalDataSource = {
      read: () => null,
      write: () => {
        throw new Error('QuotaExceededError');
      },
    };
    const repository = new DefaultOnboardingRepository(full);

    const result = await repository.saveStatus('ada', { kind: 'completed' });

    expect(() => result.unwrap()).toThrow('Failed to save the onboarding progress');
  });
});
