import type { OnboardingLocalDataSource } from '@base/features/onboarding/infrastructure/repository/data-sources/onboarding-local.data-source.ts';

export class BrowserOnboardingLocalDataSource implements OnboardingLocalDataSource {
  public read(key: string): string | null {
    return localStorage.getItem(key);
  }

  public write(key: string, value: string): void {
    localStorage.setItem(key, value);
  }
}
