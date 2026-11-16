import {
    ApiError,
} from "@/shared/errors";

import {
    InstallationTokenService,
} from "@/github/app-auth/installation-token.service";

import type {
    GitHubConnection,
} from "@/relay/connections/connection.model";

import type {
    GitHubConnectionRepository,
} from "@/relay/repositories/repository.model";

import {
    RepositoryService,
} from "@/relay/repositories/repository.service";

export interface RepositoryAccess {
    repository: GitHubConnectionRepository;

    token: string;
}

/**
 * The connection-status and repository-ownership check every Development
 * panel call starts with: a repository that is not one of this connection's
 * own is rejected the same way whatever the call, and the installation
 * token is only minted after that check passes.
 */
export class RepositoryAccessService {
    public constructor(
        private readonly repositoryService =
        new RepositoryService(),

        private readonly installationTokenService =
        new InstallationTokenService(),
    ) {}

    /**
     * @throws ApiError CONNECTION_NOT_CONNECTED if the connection has no installation.
     * @throws ApiError GITHUB_REPOSITORY_NOT_ALLOWED if repositoryId is not one of this connection's.
     */
    public async authorize(
        connection: GitHubConnection,
        repositoryId: number,
    ): Promise<RepositoryAccess> {
        if (
            connection.status !== "connected" ||
            connection.installationId === null
        ) {
            throw new ApiError(
                "CONNECTION_NOT_CONNECTED",
                "GitHub connection is not connected.",
                409,
            );
        }

        const repositories =
            await this.repositoryService
                .listForConnection(connection);

        const repository = repositories.find(
            (candidate) =>
                candidate.repositoryId ===
                repositoryId,
        );

        if (!repository) {
            throw new ApiError(
                "GITHUB_REPOSITORY_NOT_ALLOWED",
                "This repository is not connected to this project.",
                403,
            );
        }

        const installationToken =
            await this.installationTokenService
                .create(
                    connection.installationId,
                );

        return {
            repository,
            token: installationToken.token,
        };
    }
}
