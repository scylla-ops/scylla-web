export interface OnboardingLocalDataSource {
  read(key: string): string | null;
  write(key: string, value: string): void;
}
