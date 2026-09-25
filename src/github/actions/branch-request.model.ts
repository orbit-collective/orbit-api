export interface CreateGitHubBranchRequest {
    repositoryId: number;

    name: string;

    baseBranch?: string | undefined;
}
