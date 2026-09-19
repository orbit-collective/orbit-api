import {
    githubRequest,
} from "@/github/app-auth/github-api";

import type {
    GitHubIssueComment,
} from "./github-comment.types";

export class GitHubCommentClient {
    public async create(
        token: string,
        owner: string,
        repository: string,
        pullRequestNumber: number,
        body: string,
    ): Promise<GitHubIssueComment> {
        return githubRequest<
            GitHubIssueComment
        >(
            `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/issues/${pullRequestNumber}/comments`,
            {
                method: "POST",
                token,
                body: {
                    body,
                },
            },
        );
    }
}