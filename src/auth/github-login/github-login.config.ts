import { env } from "@/shared/env";

/**
 * The callback URL orbit-api itself registers with GitHub for the *login*
 * flow - deliberately separate from GITHUB_CALLBACK_URL (the installation
 * flow's own callback), since GitHub requires the exact redirect_uri used to
 * start the OAuth dance to also be sent back when exchanging the code. Both
 * URLs are registered against the same GitHub App/OAuth client (GitHub Apps
 * support more than one callback URL), so no second app is needed.
 */
export function getGitHubLoginCallbackUrl(): string {
    return env("GITHUB_LOGIN_CALLBACK_URL");
}
