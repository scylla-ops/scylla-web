import type { VcsProvider } from '../structs/vcs-provider.struct.ts';

/**
 * The Git provider App of the server: made with the manifest flow of GitHub, or from the
 * settings of the server. No field holds a key or a secret.
 */
export interface VcsAppEntity {
  /** Empty for an App of the settings: it has no row. */
  id: string;
  provider: VcsProvider;
  /** The id of the App on the provider. */
  appId: string;
  slug: string;
  name: string;
  /** The login of the account that owns the App. Empty when the server does not know it. */
  owner: string;
  /** The page of the App on the provider. */
  webUrl: string;
  /** The address of this server where the provider sends the webhooks of the App. */
  webhookUrl: string;
  /** Not set before the first webhook. */
  lastDeliveryAt?: string;
  /** The HTTP status that the server gave to the last webhook. 0 before the first one. */
  lastDeliveryStatus: number;
  /** The App comes from the settings of the server: it cannot change here. */
  managedBySettings: boolean;
  /** Not set for an App of the settings. */
  createdAt?: string;
}

/** What the browser posts to GitHub to create the App. */
export interface GitHubManifest {
  /** The page of GitHub, with a state of one hour. */
  postUrl: string;
  /** The manifest of the App, as JSON: the value of the form field `manifest`. */
  manifest: string;
  expiresAt: string;
}

/** The values of the redirect of GitHub after the creation of the App. */
export interface CompleteGitHubManifestInput {
  code: string;
  state: string;
}
