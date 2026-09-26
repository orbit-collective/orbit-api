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
    GitHubBranchClient,
} from "./branch.client";

import type {
    CreateGitHubBranchRequest,
} from "./branch-request.model";

export interface CreatedGitHubBranch {
    name: string;

    url: string;
}

export class BranchService {
    public constructor(
        private readonly repositoryService =
        new RepositoryService(),

        private readonly installationTokenService =
        new InstallationTokenService(),

        private readonly branchClient =
        new GitHubBranchClient(),
    ) {}

    /**
     * @throws ApiError GITHUB_REPOSITORY_NOT_ALLOWED if repositoryId is not
     *                    one of this connection's own repositories.
     * @throws ApiError GITHUB_BRANCH_ALREADY_EXISTS if the ref already
     *                    exists - never force-updates an existing branch.
     */
    public async create(
        connection: GitHubConnection,
        input: CreateGitHubBranchRequest,
    ): Promise<CreatedGitHubBranch> {
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

        const baseBranch =
            input.baseBranch ??
            (await this.branchClient
                .getDefaultBranch(
                    installationToken.token,
                    repository.owner,
                    repository.name,
                ));

        const baseSha =
            await this.branchClient
                .getBranchSha(
                    installationToken.token,
                    repository.owner,
                    repository.name,
                    baseBranch,
                );

        try {
            await this.branchClient
                .create(
                    installationToken.token,
                    repository.owner,
                    repository.name,
                    input.name,
                    baseSha,
                );
        } catch (error) {
            if (
                error instanceof
                ApiError &&
                error.githubStatus ===
                422
            ) {
                throw new ApiError(
                    "GITHUB_BRANCH_ALREADY_EXISTS",
                    `A branch named "${input.name}" already exists in ${repository.owner}/${repository.name}.`,
                    409,
                );
            }

            // Any other GitHub rejection - surface its own safe, public
            // top-level message instead of the generic "GitHub API request
            // failed." (see PullRequestService for the same pattern).
            if (
                error instanceof
                ApiError &&
                error.githubMessage
            ) {
                throw new ApiError(
                    "GITHUB_BRANCH_REJECTED",
                    error.githubMessage,
                    422,
                );
            }

            throw error;
        }

        return {
            name: input.name,

            url: `https://github.com/${repository.owner}/${repository.name}/tree/${input.name}`,
        };
    }
}
