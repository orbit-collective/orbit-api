import {
    githubGraphql,
    githubRequest,
} from "@/github/app-auth/github-api";

import type {
    GitHubBranchSummary,
    GitHubCheckRunsResponse,
    GitHubCombinedStatus,
    GitHubCommit,
    GitHubIssue,
    GitHubMergeResult,
    GitHubCommitActivityWeek,
    GitHubContributor,
    GitHubPullRequestDetail,
    GitHubPullRequestSummary,
    GitHubRepositoryDetails,
    GitHubReview,
} from "./development.types";

/** GitHub's largest page: the fewest requests to read every branch. */
export const BRANCHES_PAGE_SIZE = 100;

interface GraphqlCheckContext {
    __typename: string;

    name?: string;

    status?: string;

    conclusion?: string | null;

    detailsUrl?: string | null;

    startedAt?: string | null;

    completedAt?: string | null;

    context?: string;

    state?: string;

    targetUrl?: string | null;

    description?: string | null;
}

export type MergeMethod =
    | "merge"
    | "squash"
    | "rebase";

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

    /**
     * Issues of the repository, newest update first. GitHub's issues list also
     * holds pull requests; the caller filters those out.
     */
    public listIssues(
        token: string,
        owner: string,
        name: string,
        state: PullRequestListState,
        page: number,
        perPage: number,
        since?: string,
    ): Promise<GitHubIssue[]> {
        const sinceQuery =
            since === undefined
                ? ""
                : `&since=${encodeURIComponent(since)}`;

        return githubRequest<GitHubIssue[]>(
            `${repositoryPath(owner, name)}/issues?state=${state}&sort=updated&direction=desc&per_page=${perPage}&page=${page}${sinceQuery}`,
            { token },
        );
    }

    /** A comment on a pull request (they are issues to GitHub's comments API). */
    public createComment(
        token: string,
        owner: string,
        name: string,
        number: number,
        body: string,
    ): Promise<{ id: number; html_url: string }> {
        return githubRequest<{ id: number; html_url: string }>(
            `${repositoryPath(owner, name)}/issues/${number}/comments`,
            {
                method: "POST",
                token,
                body: { body },
            },
        );
    }

    /**
     * Merges a pull request. GitHub refuses with 405 when it is not
     * mergeable (a failing required check, a conflict, a method the
     * repository does not allow) and 409 when the head moved meanwhile.
     */
    public mergePullRequest(
        token: string,
        owner: string,
        name: string,
        number: number,
        options: {
            method: MergeMethod;

            commitTitle?: string;

            commitMessage?: string;

            expectedHeadSha?: string;
        },
    ): Promise<GitHubMergeResult> {
        return githubRequest<GitHubMergeResult>(
            `${repositoryPath(owner, name)}/pulls/${number}/merge`,
            {
                method: "PUT",
                token,
                body: {
                    merge_method: options.method,
                    ...(options.commitTitle !== undefined && { commit_title: options.commitTitle }),
                    ...(options.commitMessage !== undefined && { commit_message: options.commitMessage }),
                    ...(options.expectedHeadSha !== undefined && { sha: options.expectedHeadSha }),
                },
            },
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

    /**
     * The checks and commit statuses of several commits in ONE GraphQL call
     * (the REST way is two calls per commit). A ref GitHub cannot resolve, or
     * a commit without any checks, is null.
     */
    public async getChecksOfRefs(
        token: string,
        owner: string,
        name: string,
        refs: string[],
    ): Promise<
        Record<
            string,
            {
                checkRuns: GitHubCheckRunsResponse;

                combined: GitHubCombinedStatus;
            } | null
        >
    > {
        const variables: Record<string, unknown> = {
            owner,
            name,
        };

        const fields = refs.map(
            (ref, index) => {
                variables[`ref${index}`] = ref;

                return `c${index}: object(expression: $ref${index}) {
                    ... on Commit {
                        statusCheckRollup {
                            contexts(first: 100) {
                                nodes {
                                    __typename
                                    ... on CheckRun { name status conclusion detailsUrl startedAt completedAt }
                                    ... on StatusContext { context state targetUrl description }
                                }
                            }
                        }
                    }
                }`;
            },
        );

        const query = `query($owner: String!, $name: String!, ${refs
            .map(
                (_ref, index) =>
                    `$ref${index}: String!`,
            )
            .join(", ")}) {
            repository(owner: $owner, name: $name) {
                ${fields.join("\n")}
            }
        }`;

        const data = await githubGraphql<{
            repository: Record<
                string,
                {
                    statusCheckRollup?: {
                        contexts: {
                            nodes: GraphqlCheckContext[];
                        };
                    } | null;
                } | null
            > | null;
        }>(
            query,
            variables,
            token,
        );

        const result: Record<
            string,
            {
                checkRuns: GitHubCheckRunsResponse;

                combined: GitHubCombinedStatus;
            } | null
        > = {};

        refs.forEach(
            (ref, index) => {
                const commit =
                    data.repository?.[`c${index}`];

                if (!commit) {
                    result[ref] = null;

                    return;
                }

                const nodes =
                    commit.statusCheckRollup?.contexts
                        .nodes ?? [];

                const checkRuns = nodes.flatMap(
                    (node) =>
                        node.__typename === "CheckRun"
                            ? [{
                                name: node.name ?? "",
                                status: (node.status ?? "").toLowerCase(),
                                conclusion:
                                    node.conclusion
                                        ? node.conclusion.toLowerCase()
                                        : null,
                                html_url: node.detailsUrl ?? null,
                                started_at: node.startedAt ?? null,
                                completed_at: node.completedAt ?? null,
                            }]
                            : [],
                );

                const statuses = nodes.flatMap(
                    (node) =>
                        node.__typename === "StatusContext"
                            ? [{
                                context: node.context ?? "",
                                state: (node.state ?? "").toLowerCase(),
                                target_url: node.targetUrl ?? null,
                                description: node.description ?? null,
                            }]
                            : [],
                );

                result[ref] = {
                    checkRuns: {
                        total_count: checkRuns.length,
                        check_runs: checkRuns,
                    },
                    combined: {
                        state: "",
                        statuses,
                    },
                };
            },
        );

        return result;
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
