export interface GitHubRepositoryInfo {
    default_branch: string;
}

export interface GitHubGitRef {
    ref: string;

    object: {
        sha: string;
    };
}
