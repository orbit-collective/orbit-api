/**
 * A pending "sign in with GitHub" attempt, keyed by a random state token
 * generated when the flow starts. Resolved exactly once, when GitHub redirects
 * back with that same state - see LoginStateRepository.
 */
export interface GitHubLoginState {
    /** Where to send the browser back to once GitHub's OAuth round-trip finishes - the originating Orbit Local instance's own callback URL, state included. */
    returnTo: string;

    createdAt: string;
    expiresAt: string;
}
