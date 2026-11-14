import type {
  CheckedGitLabConnection,
  CompleteGitHubInstallInput,
  CompletedGitHubInstall,
  ConnectGitLabInput,
  GitHubInstall,
  ProviderRepositoryPage,
  ReplaceGitLabTokenInput,
  VcsConnectionEntity,
} from '../entities/vcs-connection.entity.ts';
import type { VcsProviderInfo } from '../structs/vcs-provider.struct.ts';

export interface ListProviderRepositoriesInput {
  /** The project to link: the server checks the permission on it. */
  projectId: string;
  connectionId: string;
  search?: string;
  pageToken?: string;
}

export interface VcsConnectionRepository {
  /** GitHub, then GitLab. A provider that this build does not know is not in the list. */
  getProviders(workspaceId: string): Promise<VcsProviderInfo[]>;
  /** Oldest first. A connection of a provider that this build does not know is not in the list. */
  listByWorkspace(workspaceId: string): Promise<VcsConnectionEntity[]>;
  getById(id: string): Promise<VcsConnectionEntity>;
  startGitHubInstall(workspaceId: string): Promise<GitHubInstall>;
  /** The authorize page when the server refuses with `AUTHORIZATION_REQUIRED`. */
  completeGitHubInstall(input: CompleteGitHubInstallInput): Promise<CompletedGitHubInstall>;
  connectGitLab(input: ConnectGitLabInput): Promise<CheckedGitLabConnection>;
  replaceGitLabToken(input: ReplaceGitLabTokenInput): Promise<CheckedGitLabConnection>;
  deleteById(id: string): Promise<void>;
  listRepositories(input: ListProviderRepositoriesInput): Promise<ProviderRepositoryPage>;
}
