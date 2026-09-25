import {
    githubRequest,
} from "@/github/app-auth/github-api";

import type {
    GitHubGitRef,
    GitHubRepositoryInfo,
} from "./github-branch.types";

/**
 * Raw GitHub Git Data API calls a branch creation goes through - never
 * force-updates an existing ref (see BranchService, which maps GitHub's own
 * 422 "Reference already exists" into a domain error instead of retrying
 * with a force-update).
 */
export class GitHubBranchClient {
    public async getDefaultBranch(
        token: string,
        owner: string,
        repository: string,
    ): Promise<string> {
        const info =
            await githubRequest<
                GitHubRepositoryInfo
            >(
                `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`,
                {
                    token,
                },
            );

        return info.default_branch;
    }

    public async getBranchSha(
        token: string,
        owner: string,
        repository: string,
        branch: string,
    ): Promise<string> {
        const ref =
            await githubRequest<
                GitHubGitRef
            >(
                `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/git/ref/heads/${encodeURIComponent(branch)}`,
                {
                    token,
                },
            );

        return ref.object.sha;
    }

    public async create(
        token: string,
        owner: string,
        repository: string,
        name: string,
        fromSha: string,
    ): Promise<GitHubGitRef> {
        return githubRequest<
            GitHubGitRef
        >(
            `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/git/refs`,
            {
                method: "POST",
                token,
                body: {
                    ref: `refs/heads/${name}`,
                    sha: fromSha,
                },
            },
        );
    }
}
