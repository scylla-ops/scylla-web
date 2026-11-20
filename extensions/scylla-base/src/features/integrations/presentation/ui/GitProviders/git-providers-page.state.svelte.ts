import { can, Permission } from '@platform/authz';
import { createMutation, createQuery } from '@scylla/core-sdk';
import type { GitHubManifest } from '@base/features/integrations/domain/entities/vcs-app.entity.ts';
import { gitHubOrganizationIssue } from '@base/features/integrations/domain/structs/github-organization.struct.ts';
import {
  manifestErrorText,
  organizationIssueText,
} from '@base/features/integrations/presentation/presenters/vcs-app.presenter.ts';
import {
  vcsAppMutations,
  vcsAppQueries,
} from '@base/features/integrations/presentation/vcs-app.queries.ts';

/** Who owns the new App on GitHub: an organization, or the account of the person. */
export type AppOwner = 'organization' | 'account';

/** The ViewModel of the Git providers page. Construct it during component initialisation. */
export const createGitProvidersPage = () => {
  const canManage = $derived(can(Permission.MANAGE_GIT_PROVIDERS));
  const publicUrl: string = import.meta.env.VITE_API_URL || window.location.origin;
  const app = createQuery(() => vcsAppQueries.get());
  const start = createMutation(() => vcsAppMutations.startGitHubManifest());
  const remove = createMutation(() => vcsAppMutations.remove());

  let owner = $state<AppOwner>('organization');
  let organization = $state('');
  let touched = $state(false);
  let confirming = $state(false);
  /** The manifest to post: the page leaves for GitHub. */
  let manifest = $state<GitHubManifest | null>(null);

  const issue = $derived(owner === 'organization' ? gitHubOrganizationIssue(organization) : null);

  return {
    query: app,
    get app() {
      return app.data ?? null;
    },
    get canManage() {
      return canManage;
    },
    /** The address of this server, where GitHub sends the webhooks. */
    publicUrl,

    get owner() {
      return owner;
    },
    setOwner: (next: AppOwner) => (owner = next),
    get organization() {
      return organization;
    },
    setOrganization: (next: string) => (organization = next),
    touch: () => (touched = true),
    get organizationError() {
      return touched ? organizationIssueText(issue) : '';
    },

    get creating() {
      return start.isPending || manifest !== null;
    },
    get createError() {
      return start.isError ? manifestErrorText(start.error) : '';
    },
    get manifest() {
      return manifest;
    },
    create: () => {
      touched = true;
      if (issue || !canManage) return;
      const login = owner === 'organization' ? organization.trim() : '';
      start.mutate(login, { onSuccess: made => (manifest = made) });
    },

    get confirming() {
      return confirming;
    },
    setConfirming: (open: boolean) => (confirming = open),
    get removing() {
      return remove.isPending;
    },
    remove: () => remove.mutate(undefined, { onSuccess: () => (confirming = false) }),
  };
};

export type GitProvidersPage = ReturnType<typeof createGitProvidersPage>;
