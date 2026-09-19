import {
    githubRequest,
} from "@/github/app-auth/github-api";

import {
    InstallationTokenService,
} from "@/github/app-auth/installation-token.service";

import {
    ApiError,
} from "@/shared/errors";

import type {
    GitHubRepository,
    GitHubUserInstallation,
} from "./github-oauth.types";

interface InstallationsResponse {
    total_count: number;

    installations:
        GitHubUserInstallation[];
}

interface RepositoriesResponse {
    total_count: number;

    repositories:
        GitHubRepository[];
}

export class GitHubInstallationService {
    public async findInstallationForUser(
        userToken: string,
        installationId: number,
    ): Promise<GitHubUserInstallation> {
        const result =
            await githubRequest<
                InstallationsResponse
            >(
                "/user/installations",
                {
                    token:
                    userToken,
                },
            );

        const installation =
            result.installations.find(
                item =>
                    item.id ===
                    installationId,
            );

        if (!installation) {
            throw new ApiError(
                "INSTALLATION_NOT_ACCESSIBLE",
                "The GitHub installation is not accessible to the authenticated user.",
                403,
            );
        }

        return installation;
    }

    public async listRepositories(
        installationId: number,
    ): Promise<
        GitHubRepository[]
    > {
        const tokenService =
            new InstallationTokenService();

        const installationToken =
            await tokenService.create(
                installationId,
            );

        const result =
            await githubRequest<
                RepositoriesResponse
            >(
                "/installation/repositories?per_page=100",
                {
                    token:
                    installationToken
                        .token,
                },
            );

        return result.repositories;
    }
}