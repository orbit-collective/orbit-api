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

        return githubRequest<
            GitHubInstallationAccessToken
        >(
            `/app/installations/${installationId}/access_tokens`,
            {
                method: "POST",
                token: jwt,
            },
        );
    }
}