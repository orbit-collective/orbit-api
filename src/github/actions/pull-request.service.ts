import {
    ApiError,
} from "@/shared/errors";

import {
    InstallationTokenService,
} from "@/github/app-auth/installation-token.service";

import type {
    GitHubConnection,
} from "@/relay/connections/connection.model";

import {
    RepositoryService,
} from "@/relay/repositories/repository.service";

import {
    GitHubPullRequestClient,
} from "./pull-request.client";

import type {
    CreateGitHubPullRequestRequest,
} from "./pull-request-request.model";

export interface CreatedGitHubPullRequest {
    number: number;

    url: string;

    title: string;
}

/**
 * Never creates the ExternalIssueLink itself - the canonical `opened`
 * webhook (already the sole writer for every externally-created PR too) is
 * the one source of truth for that link, so there is nothing here to race
 * against it. This only creates the PR on GitHub and hands back safe
 * metadata for a toast/redirect.
 */
export class PullRequestService {
    public constructor(
        private readonly repositoryService =
        new RepositoryService(),

        private readonly installationTokenService =
        new InstallationTokenService(),

        private readonly pullRequestClient =
        new GitHubPullRequestClient(),
    ) {}

    /**
     * @throws ApiError GITHUB_REPOSITORY_NOT_ALLOWED if repositoryId is not
     *                    one of this connection's own repositories.
     */
    public async create(
        connection: GitHubConnection,
        input: CreateGitHubPullRequestRequest,
    ): Promise<CreatedGitHubPullRequest> {
        if (
            connection.status !==
            "connected" ||
            connection.installationId ===
            null
        ) {
            throw new ApiError(
                "CONNECTION_NOT_CONNECTED",
                "GitHub connection is not connected.",
                409,
            );
        }

        const repositories =
            await this.repositoryService
                .listForConnection(
                    connection,
                );

        const repository =
            repositories.find(
                (candidate) =>
                    candidate.repositoryId ===
                    input.repositoryId,
            );

        if (!repository) {
            throw new ApiError(
                "GITHUB_REPOSITORY_NOT_ALLOWED",
                "This repository is not connected to this project.",
                403,
            );
        }

        const installationToken =
            await this
                .installationTokenService
                .create(
                    connection
                        .installationId,
                );

        let pullRequest;

        try {
            pullRequest =
                await this
                    .pullRequestClient
                    .create(
                        installationToken.token,
                        repository.owner,
                        repository.name,
                        input.title,
                        input.head,
                        input.base,
                        input.body,
                    );
        } catch (error) {
            // GitHub's own top-level `message` (e.g. "Validation Failed",
            // "No commits between master and my-branch", or "A pull request
            // already exists for owner:head.") is safe to surface as-is -
            // it's already public API response text, not an internal
            // detail - unlike the generic "GitHub API request failed."
            // every other failure reduces to.
            if (
                error instanceof
                ApiError &&
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

        return {
            number:
            pullRequest.number,

            url:
            pullRequest.html_url,

            title:
            pullRequest.title,
        };
    }
}
