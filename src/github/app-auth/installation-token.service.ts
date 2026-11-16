import {githubRequest,} from "./github-api";
import {createGitHubAppJwt,} from "./github-app-jwt";
import type {GitHubInstallationAccessToken,} from "./github.types";

/** A token is replaced this long before GitHub says it expires. */
const EXPIRY_MARGIN_MS = 5 * 60 * 1000;

/**
 * Installation tokens live for an hour, and minting one costs a signed JWT
 * plus a GitHub round trip, so one warm function instance reuses the token it
 * already has until shortly before it expires. A cold instance just mints.
 */
const tokens = new Map<
    number,
    GitHubInstallationAccessToken
>();

export function clearInstallationTokenCache(): void {
    tokens.clear();
}

export class InstallationTokenService {
    public async create(
        installationId: number,
    ): Promise<GitHubInstallationAccessToken> {
        const cached =
            tokens.get(installationId);

        if (
            cached &&
            Date.parse(cached.expires_at) -
            EXPIRY_MARGIN_MS >
            Date.now()
        ) {
            return cached;
        }

        const jwt =
            await createGitHubAppJwt();

        const token = await githubRequest<
            GitHubInstallationAccessToken
        >(
            `/app/installations/${installationId}/access_tokens`,
            {
                method: "POST",
                token: jwt,
            },
        );

        tokens.set(
            installationId,
            token,
        );

        return token;
    }
}
