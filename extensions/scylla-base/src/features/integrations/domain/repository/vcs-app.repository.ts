import type {
  CompleteGitHubManifestInput,
  GitHubManifest,
  VcsAppEntity,
} from '../entities/vcs-app.entity.ts';

/** The Git provider App of the server: `VcsAppService`, for the instance admins. */
export interface VcsAppRepository {
  /** `null` when the server has no App. */
  get(): Promise<VcsAppEntity | null>;
  /** An empty organization: the GitHub account of the person makes the App. */
  startGitHubManifest(organization: string): Promise<GitHubManifest>;
  completeGitHubManifest(input: CompleteGitHubManifestInput): Promise<VcsAppEntity>;
  /** Each GitHub connection of the App becomes disconnected. The App stays on GitHub. */
  remove(): Promise<void>;
}
