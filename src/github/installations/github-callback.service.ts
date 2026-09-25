import {
    GitHubOAuthService,
} from "./github-oauth.service";

import {
    GitHubInstallationService,
} from "./github-installation.service";

import {
    ConnectionStateService,
} from "@/relay/connections/connection-state.service";

import {
    ConnectionRepository,
} from "@/relay/connections/connection.repository";

import {
    RepositoryRepository,
} from "@/relay/repositories/repository.repository";

import {
    ApiError,
} from "@/shared/errors";

import {
    now,
} from "@/shared/time";

import {
    toConnectionDto,
} from "@/relay/connections/connection.dto";

export class GitHubCallbackService {
    public constructor(
        private readonly stateService =
        new ConnectionStateService(),

        private readonly oauthService =
        new GitHubOAuthService(),

        private readonly installationService =
        new GitHubInstallationService(),

        private readonly connectionRepository =
        new ConnectionRepository(),

        private readonly repositoryRepository =
        new RepositoryRepository(),
    ) {}

    public async handle(
        code: string,
        state: string,
        installationId: number,
    ) {
        const connection =
            await this.stateService
                .resolve(state);

        const userToken =
            await this.oauthService
                .exchangeCode(code);

        await this.installationService
            .findInstallationForUser(
                userToken,
                installationId,
            );

        const repositories =
            await this
                .installationService
                .listRepositories(
                    installationId,
                );

        if (
            repositories.length ===
            0
        ) {
            throw new ApiError(
                "NO_REPOSITORY_SELECTED",
                "No GitHub repository was selected.",
                400,
            );
        }

        // The primary/first repository is also mirrored onto the
        // connection's own scalar fields, matching every connection
        // created before multi-repository support - see
        // RepositoryService's legacy fallback for why that still matters.
        const primaryRepository =
            repositories[0];

        if (!primaryRepository) {
            throw new ApiError(
                "REPOSITORY_NOT_FOUND",
                "Selected repository could not be resolved.",
                400,
            );
        }

        connection.status =
            "connected";

        connection.installationId =
            installationId;

        connection.repositoryId =
            primaryRepository.id;

        connection.repositoryOwner =
            primaryRepository.owner.login;

        connection.repositoryName =
            primaryRepository.name;

        connection.connectedAt =
            now();

        await this
            .connectionRepository
            .save(connection)

        for (const repository of repositories) {
            await this
                .repositoryRepository
                .create({
                    connectionId:
                    connection.id,

                    installationId,

                    repositoryId:
                    repository.id,

                    owner:
                    repository.owner
                        .login,

                    name:
                    repository.name,

                    addedAt:
                        connection.connectedAt,
                });
        }

        await this
            .connectionRepository
            .removeStateLookup(
                connection.stateHash,
            );

        return toConnectionDto(
            connection,
            repositories.map(
                (repository) => ({
                    connectionId:
                    connection.id,

                    installationId,

                    repositoryId:
                    repository.id,

                    owner:
                    repository.owner
                        .login,

                    name:
                    repository.name,

                    addedAt:
                        connection.connectedAt as string,
                }),
            ),
        );
    }
}