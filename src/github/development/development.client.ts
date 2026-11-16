import {
    githubRequest,
} from "@/github/app-auth/github-api";

import type {
    GitHubBranchSummary,
    GitHubCheckRunsResponse,
    GitHubCombinedStatus,
    GitHubCommit,
    GitHubCommitActivityWeek,
    GitHubContributor,
    GitHubPullRequestDetail,
    GitHubPullRequestSummary,
    GitHubRepositoryDetails,
    GitHubReview,
} from "./development.types";

/** GitHub's largest page: the fewest requests to read every branch. */
export const BRANCHES_PAGE_SIZE = 100;

export type PullRequestListState =
    | "open"
    | "closed"
    | "all";

/**
 * Raw read/update calls the Development panel goes through. Every method
 * takes an installation token and the owner/name pair of a repository the
 * service has already proven belongs to the caller's connection.
 */
export class GitHubDevelopmentClient {
    public getRepository(
        token: string,
        owner: string,
        name: string,
    ): Promise<GitHubRepositoryDetails> {
        return githubRequest<GitHubRepositoryDetails>(
            repositoryPath(owner, name),
            { token },
        );
    }

    public listPullRequests(
        token: string,
        owner: string,
        name: string,
        state: PullRequestListState,
        page: number,
        perPage: number,
    ): Promise<GitHubPullRequestSummary[]> {
        return githubRequest<GitHubPullRequestSummary[]>(
            `${repositoryPath(owner, name)}/pulls?state=${state}&sort=updated&direction=desc&per_page=${perPage}&page=${page}`,
            { token },
        );
    }

    public getPullRequest(
        token: string,
        owner: string,
        name: string,
        number: number,
    ): Promise<GitHubPullRequestDetail> {
        return githubRequest<GitHubPullRequestDetail>(
            `${repositoryPath(owner, name)}/pulls/${number}`,
            { token },
        );
    }

    public listPullRequestReviews(
        token: string,
        owner: string,
        name: string,
        number: number,
    ): Promise<GitHubReview[]> {
        return githubRequest<GitHubReview[]>(
            `${repositoryPath(owner, name)}/pulls/${number}/reviews?per_page=100`,
            { token },
        );
    }

    public listPullRequestCommits(
        token: string,
        owner: string,
        name: string,
        number: number,
    ): Promise<GitHubCommit[]> {
        return githubRequest<GitHubCommit[]>(
            `${repositoryPath(owner, name)}/pulls/${number}/commits?per_page=100`,
            { token },
        );
    }

    public updatePullRequest(
        token: string,
        owner: string,
        name: string,
        number: number,
        changes: {
            state?: "open" | "closed";

            title?: string;

            body?: string;
        },
    ): Promise<GitHubPullRequestDetail> {
        return githubRequest<GitHubPullRequestDetail>(
            `${repositoryPath(owner, name)}/pulls/${number}`,
            {
                method: "PATCH",
                token,
                body: changes,
            },
        );
    }

    public listCommits(
        token: string,
        owner: string,
        name: string,
        branch: string | undefined,
        page: number,
        perPage: number,
    ): Promise<GitHubCommit[]> {
        const sha =
            branch === undefined
                ? ""
                : `&sha=${encodeURIComponent(branch)}`;

        return githubRequest<GitHubCommit[]>(
            `${repositoryPath(owner, name)}/commits?per_page=${perPage}&page=${page}${sha}`,
            { token },
        );
    }

    public listBranches(
        token: string,
        owner: string,
        name: string,
        page = 1,
    ): Promise<GitHubBranchSummary[]> {
        return githubRequest<GitHubBranchSummary[]>(
            `${repositoryPath(owner, name)}/branches?per_page=${BRANCHES_PAGE_SIZE}&page=${page}`,
            { token },
        );
    }

    public getCheckRuns(
        token: string,
        owner: string,
        name: string,
        ref: string,
    ): Promise<GitHubCheckRunsResponse> {
        return githubRequest<GitHubCheckRunsResponse>(
            `${repositoryPath(owner, name)}/commits/${encodeURIComponent(ref)}/check-runs?per_page=100`,
            { token },
        );
    }

    public getCombinedStatus(
        token: string,
        owner: string,
        name: string,
        ref: string,
    ): Promise<GitHubCombinedStatus> {
        return githubRequest<GitHubCombinedStatus>(
            `${repositoryPath(owner, name)}/commits/${encodeURIComponent(ref)}/status`,
            { token },
        );
    }

    public listContributors(
        token: string,
        owner: string,
        name: string,
    ): Promise<GitHubContributor[]> {
        return githubRequest<GitHubContributor[]>(
            `${repositoryPath(owner, name)}/contributors?per_page=10`,
            { token },
        );
    }

    public getLanguages(
        token: string,
        owner: string,
        name: string,
    ): Promise<Record<string, number>> {
        return githubRequest<Record<string, number>>(
            `${repositoryPath(owner, name)}/languages`,
            { token },
        );
    }

    /**
     * GitHub computes this on first request and answers 202 with an empty
     * body until it is ready, which githubRequest cannot parse - callers
     * treat any failure here as "no activity data yet".
     */
    public getCommitActivity(
        token: string,
        owner: string,
        name: string,
    ): Promise<GitHubCommitActivityWeek[]> {
        return githubRequest<GitHubCommitActivityWeek[]>(
            `${repositoryPath(owner, name)}/stats/commit_activity`,
            { token },
        );
    }
}

function repositoryPath(
    owner: string,
    name: string,
): string {
    return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
}
