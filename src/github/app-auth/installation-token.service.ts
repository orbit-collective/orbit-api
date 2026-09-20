import {githubRequest,} from "./github-api";
import {createGitHubAppJwt,} from "./github-app-jwt";
import type {GitHubInstallationAccessToken,} from "./github.types";

export class InstallationTokenService {
    public async create(
        installationId: number,
    ): Promise<GitHubInstallationAccessToken> {
        const jwt =
            await createGitHubAppJwt();

        return await githubRequest<
            GitHubInstallationAccessToken
        >(
            `/app/installations/${installationId}/access_tokens`,
            {
                method: "POST",
                token: jwt,
            },
        );
    }

    // TODO: Cache installation access tokens until shortly before expiry
    // if GitHub API traffic becomes high enough to justify it.
}