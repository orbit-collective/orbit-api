export interface CreateGitHubPullRequestRequest {
    repositoryId: number;

    title: string;

    head: string;

    base: string;

    body: string;
}
