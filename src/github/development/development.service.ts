import {
    ApiError,
} from "@/shared/errors";

import {
    mapWithConcurrency,
} from "@/shared/concurrency";

import type {
    GitHubConnection,
} from "@/relay/connections/connection.model";

import {
    GitHubDevelopmentClient,
    type PullRequestListState,
} from "./development.client";

import type {
    BranchDto,
    CiSummaryDto,
    CommitDto,
    InsightsDto,
    PullRequestDetailDto,
    PullRequestDto,
} from "./development.dto";

import {
    summariseCi,
    toBranch,
    toCommit,
    toPullRequest,
    toPullRequestDetail,
} from "./development.mapper";

import {
    RepositoryAccessService,
} from "./repository-access.service";

/** How many open pull requests of a list get their CI looked up, and how many at once. */
const CI_LOOKUP_LIMIT = 20;
const CI_LOOKUP_CONCURRENCY = 5;

export interface UpdatePullRequestInput {
    repositoryId: number;

    number: number;

    state?: "open" | "closed";

    title?: string;

    body?: string;
}

/**
 * Read models and small writes for the Development panel in Orbit. Every
 * public method authorises the repository against the caller's connection
 * first; GitHub's own payloads never leave this class, only the DTOs of
 * development.dto.ts do.
 */
export class DevelopmentService {
    public constructor(
        private readonly access =
        new RepositoryAccessService(),

        private readonly client =
        new GitHubDevelopmentClient(),
    ) {}

    public async listPullRequests(
        connection: GitHubConnection,
        repositoryId: number,
        state: PullRequestListState,
        page: number,
        perPage: number,
    ): Promise<PullRequestDto[]> {
        const { repository, token } =
            await this.access.authorize(
                connection,
                repositoryId,
            );

        const pullRequests =
            await this.client.listPullRequests(
                token,
                repository.owner,
                repository.name,
                state,
                page,
                perPage,
            );

        const openOnes = pullRequests
            .filter(
                (pullRequest) =>
                    pullRequest.state === "open",
            )
            .slice(0, CI_LOOKUP_LIMIT);

        const summaries = new Map<
            number,
            CiSummaryDto | null
        >();

        await mapWithConcurrency(
            openOnes,
            CI_LOOKUP_CONCURRENCY,
            async (pullRequest) => {
                summaries.set(
                    pullRequest.number,
                    await this.ciOrNull(
                        token,
                        repository.owner,
                        repository.name,
                        pullRequest.head.sha,
                    ),
                );
            },
        );

        return pullRequests.map((pullRequest) =>
            toPullRequest(
                pullRequest,
                summaries.get(pullRequest.number) ??
                null,
            ),
        );
    }

    public async getPullRequest(
        connection: GitHubConnection,
        repositoryId: number,
        number: number,
    ): Promise<PullRequestDetailDto> {
        const { repository, token } =
            await this.access.authorize(
                connection,
                repositoryId,
            );

        const { owner, name } = repository;

        const pullRequest =
            await this.client.getPullRequest(
                token,
                owner,
                name,
                number,
            );

        const [reviews, commits, ci] =
            await Promise.all([
                this.client.listPullRequestReviews(
                    token,
                    owner,
                    name,
                    number,
                ),
                this.client.listPullRequestCommits(
                    token,
                    owner,
                    name,
                    number,
                ),
                this.ciOrNull(
                    token,
                    owner,
                    name,
                    pullRequest.head.sha,
                ),
            ]);

        return toPullRequestDetail(
            pullRequest,
            reviews,
            commits,
            ci,
        );
    }

    /**
     * Close/reopen and/or edit the title or description (Orbit rewrites the
     * description to add or drop `orbit-issue` markers). Never merges.
     */
    public async updatePullRequest(
        connection: GitHubConnection,
        input: UpdatePullRequestInput,
    ): Promise<PullRequestDto> {
        const { repository, token } =
            await this.access.authorize(
                connection,
                input.repositoryId,
            );

        const changes: {
            state?: "open" | "closed";
            title?: string;
            body?: string;
        } = {};

        if (input.state !== undefined) {
            changes.state = input.state;
        }

        if (input.title !== undefined) {
            changes.title = input.title;
        }

        if (input.body !== undefined) {
            changes.body = input.body;
        }

        try {
            return toPullRequest(
                await this.client.updatePullRequest(
                    token,
                    repository.owner,
                    repository.name,
                    input.number,
                    changes,
                ),
            );
        } catch (error) {
            if (
                error instanceof ApiError &&
                error.githubMessage
            ) {
                throw new ApiError(
                    "GITHUB_PULL_REQUEST_REJECTED",
                    error.githubMessage,
                    422,
                );
            }

            throw error;
        }
    }

    public async listCommits(
        connection: GitHubConnection,
        repositoryId: number,
        branch: string | undefined,
        page: number,
        perPage: number,
    ): Promise<CommitDto[]> {
        const { repository, token } =
            await this.access.authorize(
                connection,
                repositoryId,
            );

        const commits =
            await this.client.listCommits(
                token,
                repository.owner,
                repository.name,
                branch,
                page,
                perPage,
            );

        return commits.map(toCommit);
    }

    public async listBranches(
        connection: GitHubConnection,
        repositoryId: number,
    ): Promise<BranchDto[]> {
        const { repository, token } =
            await this.access.authorize(
                connection,
                repositoryId,
            );

        const [branches, details] =
            await Promise.all([
                this.client.listBranches(
                    token,
                    repository.owner,
                    repository.name,
                ),
                this.client.getRepository(
                    token,
                    repository.owner,
                    repository.name,
                ),
            ]);

        return branches
            .map((branch) =>
                toBranch(
                    branch,
                    details.default_branch,
                ),
            )
            .sort(
                (a, b) =>
                    Number(b.isDefault) -
                    Number(a.isDefault),
            );
    }

    public async getChecks(
        connection: GitHubConnection,
        repositoryId: number,
        ref: string,
    ): Promise<CiSummaryDto> {
        const { repository, token } =
            await this.access.authorize(
                connection,
                repositoryId,
            );

        const [checkRuns, combined] =
            await Promise.all([
                this.client.getCheckRuns(
                    token,
                    repository.owner,
                    repository.name,
                    ref,
                ),
                this.client.getCombinedStatus(
                    token,
                    repository.owner,
                    repository.name,
                    ref,
                ),
            ]);

        return summariseCi(checkRuns, combined);
    }

    public async getInsights(
        connection: GitHubConnection,
        repositoryId: number,
    ): Promise<InsightsDto> {
        const { repository, token } =
            await this.access.authorize(
                connection,
                repositoryId,
            );

        const { owner, name } = repository;

        // The repository itself is required; the three statistics are
        // best-effort (GitHub may still be computing them, or the App may
        // lack the permission) and fall back to empty.
        const [details, contributors, languages, activity] =
            await Promise.all([
                this.client.getRepository(
                    token,
                    owner,
                    name,
                ),
                this.client
                    .listContributors(token, owner, name)
                    .catch(() => []),
                this.client
                    .getLanguages(token, owner, name)
                    .catch(() => ({})),
                this.client
                    .getCommitActivity(token, owner, name)
                    .catch(() => []),
            ]);

        return {
            repository: {
                fullName: details.full_name,
                description: details.description,
                url: details.html_url,
                private: details.private,
                defaultBranch:
                    details.default_branch,
                stars: details.stargazers_count,
                forks: details.forks_count,
                pushedAt: details.pushed_at,
            },
            contributors: (
                Array.isArray(contributors)
                    ? contributors
                    : []
            ).map((contributor) => ({
                login: contributor.login,
                avatarUrl: contributor.avatar_url,
                contributions:
                    contributor.contributions,
                url: contributor.html_url,
            })),
            languages: Object.entries(
                languages ?? {},
            )
                .map(([language, bytes]) => ({
                    name: language,
                    bytes,
                }))
                .sort((a, b) => b.bytes - a.bytes),
            commitActivity: (
                Array.isArray(activity)
                    ? activity
                    : []
            ).map((week) => ({
                weekStart: new Date(
                    week.week * 1000,
                )
                    .toISOString()
                    .slice(0, 10),
                total: week.total,
            })),
        };
    }

    /** CI is decoration on a list: a failed lookup must never fail the list. */
    private async ciOrNull(
        token: string,
        owner: string,
        name: string,
        ref: string,
    ): Promise<CiSummaryDto | null> {
        try {
            const [checkRuns, combined] =
                await Promise.all([
                    this.client.getCheckRuns(
                        token,
                        owner,
                        name,
                        ref,
                    ),
                    this.client.getCombinedStatus(
                        token,
                        owner,
                        name,
                        ref,
                    ),
                ]);

            return summariseCi(
                checkRuns,
                combined,
            );
        } catch {
            return null;
        }
    }
}
