import {
    githubRequest,
} from "@/github/app-auth/github-api";

import type {
    GitHubCreatedPullRequest,
} from "./github-pull-request.types";

export class GitHubPullRequestClient {
    public async create(
        token: string,
        owner: string,
        repository: string,
        title: string,
        head: string,
        base: string,
        body: string,
    ): Promise<GitHubCreatedPullRequest> {
        return githubRequest<
            GitHubCreatedPullRequest
        >(
            `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/pulls`,
            {
                method: "POST",
                token,
                body: {
                    title,
                    head,
                    base,
                    body,
                },
            },
        );
    }
}
