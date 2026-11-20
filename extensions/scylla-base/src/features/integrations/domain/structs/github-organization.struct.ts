/** The login of a GitHub organization: letters, digits and inner hyphens, at most 39. */
export type GitHubOrganization = string;

export type GitHubOrganizationIssue = 'required' | 'invalid';

const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

/** Why a text is not the login of an organization, or `null` when it is one. */
export const gitHubOrganizationIssue = (value: string): GitHubOrganizationIssue | null => {
  const login = value.trim();
  if (!login) return 'required';
  return LOGIN.test(login) ? null : 'invalid';
};
