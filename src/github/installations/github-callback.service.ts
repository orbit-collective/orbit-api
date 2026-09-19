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

        if (
            repositories.length >
            1
        ) {
            throw new ApiError(
                "MULTIPLE_REPOSITORIES_SELECTED",
                "GitHub Integration MVP supports exactly one repository per Orbit connection.",
                400,
            );
        }

        const repository =
            repositories[0];

        if (!repository) {
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
            repository.id;

        connection.repositoryOwner =
            repository.owner.login;

        connection.repositoryName =
            repository.name;

        connection.connectedAt =
            now();

        await this
            .connectionRepository
            .save(connection);

        return toConnectionDto(
            connection,
        );
    }
}