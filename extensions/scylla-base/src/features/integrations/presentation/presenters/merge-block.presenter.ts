import { t } from '@scylla/ui/i18n';
import type {
  MergeBlock,
  MergeBlockState,
} from '@base/features/integrations/domain/entities/merge-block.entity.ts';
import type { RepositoryLink } from '@base/features/integrations/domain/entities/repository-link.entity.ts';
import { mergeBlockMessages as messages } from '../messages/merge-block.messages.ts';
import { repositoryMessages } from '../messages/repository.messages.ts';
import { providerName } from './repository-link.presenter.ts';

export type MergeRuleTone = 'success' | 'warning' | 'muted' | 'destructive';

/** What a merge rule shows: its switch, its state, and what a person can do. */
export interface MergeRuleView {
  title: string;
  /** The state on the screen: `applying` while a change of the person is sent. */
  state: MergeBlockState;
  /** The switch: the rule is in place on the provider, or goes there now. */
  checked: boolean;
  /** `null`: the detail alone tells the state. */
  badge: { text: string; tone: MergeRuleTone } | null;
  detail: string;
  /** A page of the provider: the rule, or where a person grants the permission. */
  link: { url: string; text: string } | null;
  /** The text of the button that sends the rule again. `null`: no button. */
  retry: string | null;
  /** The steps of "Do it by hand". Empty: no steps. */
  steps: string[];
  /** The name of the check that a person copies in the last step. Empty: nothing to copy. */
  copy: string;
}

/** The value of the rule on the provider, as far as Scylla knows. */
const inPlace = (block: MergeBlock): boolean => {
  switch (block.state) {
    case 'on':
    case 'out_of_sync':
      return true;
    case 'applying':
      return block.enabled;
    // A refusal changes nothing on the provider: the rule keeps the value before the change.
    case 'failed':
      return !block.enabled;
    default:
      return false;
  }
};

const failedText = (reason: string, provider: string): string => {
  switch (reason) {
    case 'PROVIDER_LIMIT':
      return t(messages.providerLimit(provider));
    case 'PROVIDER_REFUSED':
      return t(messages.providerRefused(provider));
    case 'PROVIDER_UNAVAILABLE':
      return t(messages.providerUnavailable(provider));
    case 'REPOSITORY_NOT_ACTIVE':
      return t(messages.repositoryNotActive);
    default:
      return t(messages.notChanged(provider));
  }
};

const manualSteps = (link: RepositoryLink, branch: string): string[] =>
  link.provider === 'github'
    ? [
        t(messages.gitHubStep1(link.fullName)),
        t(messages.gitHubStep2(branch)),
        t(messages.gitHubStep3),
      ]
    : [t(messages.gitLabStep1(link.fullName)), t(messages.gitLabStep2), t(messages.gitLabStep3)];

/** The description of the card: one ruleset on GitHub, one setting of the project on GitLab. */
export const mergeCardDescription = (link: RepositoryLink): string =>
  t(
    link.provider === 'github'
      ? messages.gitHubDescription(link.fullName)
      : messages.gitLabDescription(link.fullName),
  );

/**
 * What a rule shows. `sending` is the value of a change that the server did not answer yet: the
 * rule shows it as applying.
 */
export const mergeRuleView = (
  block: MergeBlock,
  link: RepositoryLink,
  sending?: boolean,
): MergeRuleView => {
  const github = link.provider === 'github';
  const provider = providerName(link.provider);
  const branch = block.branch || link.defaultBranch;
  const view: MergeRuleView = {
    title: github ? t(messages.gitHubRule(branch, block.context)) : t(messages.gitLabRule),
    state: sending === undefined ? block.state : 'applying',
    checked: sending ?? inPlace(block),
    badge: null,
    detail: '',
    link: null,
    retry: null,
    steps: [],
    copy: '',
  };
  const page = (text: string) => (block.actionUrl ? { url: block.actionUrl, text } : null);

  switch (view.state) {
    case 'off':
      return {
        ...view,
        detail: github ? t(messages.offGitHub(block.context)) : t(messages.offGitLab),
      };
    case 'on':
      return {
        ...view,
        badge: { text: t(messages.requiredOn(branch)), tone: 'success' },
        detail: t(github ? messages.onGitHub(link.fullName) : messages.onGitLab(link.fullName)),
        link: page(t(messages.viewOn(provider))),
      };
    case 'applying':
      return { ...view, detail: t(messages.updating(provider)) };
    case 'needs_permission':
      return {
        ...view,
        badge: { text: t(messages.permissionNeeded), tone: 'warning' },
        detail: github
          ? t(messages.permissionMissing(link.account))
          : t(repositoryMessages.roleTooLow),
        link: page(t(github ? messages.grantOnGitHub : messages.roleOnGitLab)),
        steps: manualSteps(link, branch),
        copy: github ? block.context : '',
      };
    case 'not_possible':
      return {
        ...view,
        badge: { text: t(messages.notAvailable), tone: 'muted' },
        detail:
          block.stateReason === 'PRIVATE_REPOSITORY_NOT_ALLOWED'
            ? t(messages.privateNotAllowed)
            : t(messages.notAllowed(provider)),
      };
    case 'out_of_sync':
      return {
        ...view,
        badge: { text: t(messages.outOfSync), tone: 'warning' },
        detail: t(messages.changedOnProvider(provider)),
        retry: t(messages.applyAgain),
      };
    case 'failed':
      return {
        ...view,
        badge: { text: t(messages.notApplied), tone: 'destructive' },
        detail: failedText(block.stateReason, provider),
        retry: t(messages.tryAgain),
      };
  }
};
