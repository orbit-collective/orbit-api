import {
    githubRequest,
} from "./github-api";
import {
    createGitHubAppJwt,
} from "./github-app-jwt";
import type {
    GitHubInstallationAccessToken,
} from "./github.types";

export class InstallationTokenService {
    public async create(
        installationId: number,
    ): Promise<GitHubInstallationAccessToken> {
        const jwt =
            await createGitHubAppJwt();

        const token =
            await githubRequest<
                GitHubInstallationAccessToken
            >(
                `/app/installations/${installationId}/access_tokens`,
                {
                    method: "POST",
                    token: jwt,
                },
            );

        console.log(
            "GitHub installation token permissions",
            {
                installationId,
                permissions:
                token.permissions,
                repositorySelection:
                token.repository_selection,
            },
        );

        return token;
    }
}