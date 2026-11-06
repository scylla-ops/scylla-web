import type { ScyllaModule } from '@scylla/core-sdk';
import SparklesIcon from '@lucide/svelte/icons/sparkles';
import { DefaultOnboardingRepository } from './infrastructure/default-onboarding.repository.ts';
import { onboardingMessages } from './presentation/messages/onboarding.messages.ts';

const onboardingRepository = new DefaultOnboardingRepository();

export const OnboardingModule = {
  id: 'onboarding',
  domain: {
    onboardingRepository: onboardingRepository,
  },
  routes: {
    workspace: [
      {
        // The user menu opens it ("Help & tours"): its links are the `help` section of the shell.
        path: 'help',
        breadcrumb: () => ({ label: onboardingMessages.helpTitle }),
        children: [
          { redirect: 'tours' },
          {
            path: 'tours',
            breadcrumb: () => ({ label: onboardingMessages.guidedTours }),
            page: () => import('./presentation/ui/HelpPage/Help.page.svelte'),
            nav: { section: 'help', title: onboardingMessages.guidedTours, icon: SparklesIcon },
          },
        ],
      },
    ],
  },
} satisfies ScyllaModule;
