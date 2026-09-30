/**
 * A resolved GitHub identity, held just long enough for the originating
 * Orbit Local instance to redeem it server-to-server (see
 * ExchangeTokenRepository.consume) - never an access token, never anything
 * that grants API access, only the safe profile fields Local needs to log
 * a user in or link their account.
 */
export interface GitHubExchangeToken {
    githubId: string;
    githubUsername: string;
    email: string | null;
    name: string | null;

    createdAt: string;
    expiresAt: string;
}
