import { sha256 } from "@/security/hash";
import { generateStateToken } from "@/security/token";
import { now } from "@/shared/time";
import { ApiError } from "@/shared/errors";

import { getGitHubAppConfig } from "@/github/app-auth/github-app.config";
import { GitHubOAuthService } from "@/github/installations/github-oauth.service";

import { getGitHubLoginCallbackUrl } from "./github-login.config";
import { LoginStateRepository } from "./login-state.repository";
import { ExchangeTokenRepository } from "./exchange-token.repository";
import { fetchGitHubUserProfile } from "./github-user.client";

const LOGIN_STATE_TTL_MINUTES = 15;
const EXCHANGE_TOKEN_TTL_SECONDS = 60;

export interface GitHubLoginCallbackResult {
    redirectUrl: string;
}

export interface ResolvedGitHubIdentity {
    githubId: string;
    githubUsername: string;
    email: string | null;
    name: string | null;
}

/**
 * Lets any self-hosted Orbit Local instance offer "Sign in with GitHub"
 * without registering its own GitHub OAuth App - orbit-api is the only thing
 * that ever talks to GitHub's OAuth endpoints, using the one GitHub App
 * already installed for repository integration. A Local instance only ever
 * sees a short-lived, single-use exchange_token, never a GitHub access
 * token or client secret (see ExchangeTokenRepository.consume).
 */
export class GitHubLoginService {
    public constructor(
        private readonly loginStateRepository = new LoginStateRepository(),
        private readonly exchangeTokenRepository = new ExchangeTokenRepository(),
        private readonly oauthService = new GitHubOAuthService(),
    ) {}

    /**
     * @param returnTo The originating Local instance's own callback URL (its
     * own CSRF state already embedded as a query param by Local itself).
     */
    public async start(
        returnTo: string,
    ): Promise<{ url: string }> {
        const state = generateStateToken();
        const createdAt = now();

        await this.loginStateRepository.create(
            sha256(state),
            {
                returnTo,
                createdAt,
                expiresAt: new Date(
                    Date.now() + LOGIN_STATE_TTL_MINUTES * 60 * 1000,
                ).toISOString(),
            },
        );

        const config = getGitHubAppConfig();

        const url = new URL(
            "https://github.com/login/oauth/authorize",
        );

        url.searchParams.set("client_id", config.clientId);
        url.searchParams.set("scope", "user:email");
        url.searchParams.set("state", state);
        url.searchParams.set(
            "redirect_uri",
            getGitHubLoginCallbackUrl(),
        );

        return { url: url.toString() };
    }

    /**
     * Never throws once the login state has been resolved - any failure
     * from that point on (GitHub rejects the code, profile fetch fails)
     * still redirects back to the Local instance that started the flow,
     * with an `error` query param, so the browser never gets stranded on a
     * bare JSON error page mid-login.
     */
    public async callback(
        code: string,
        state: string,
    ): Promise<GitHubLoginCallbackResult> {
        const stateHash = sha256(state);
        const loginState = await this.loginStateRepository.findByStateHash(stateHash);

        if (!loginState) {
            throw new ApiError(
                "INVALID_LOGIN_STATE",
                "GitHub login state is invalid.",
                400,
            );
        }

        await this.loginStateRepository.remove(stateHash);

        if (Date.parse(loginState.expiresAt) <= Date.now()) {
            return {
                redirectUrl: withError(
                    loginState.returnTo,
                    "GitHub login took too long, please try again.",
                ),
            };
        }

        try {
            const accessToken = await this.oauthService.exchangeCode(
                code,
                getGitHubLoginCallbackUrl(),
            );

            const profile = await fetchGitHubUserProfile(accessToken);

            const token = generateStateToken();
            const createdAt = now();

            await this.exchangeTokenRepository.create(
                sha256(token),
                {
                    githubId: profile.id,
                    githubUsername: profile.login,
                    email: profile.email,
                    name: profile.name,
                    createdAt,
                    expiresAt: new Date(
                        Date.now() + EXCHANGE_TOKEN_TTL_SECONDS * 1000,
                    ).toISOString(),
                },
            );

            const redirectUrl = new URL(loginState.returnTo);
            redirectUrl.searchParams.set("exchange_token", token);

            return { redirectUrl: redirectUrl.toString() };
        } catch {
            return {
                redirectUrl: withError(
                    loginState.returnTo,
                    "GitHub authentication failed.",
                ),
            };
        }
    }

    /**
     * Redeems a one-time exchange_token for the GitHub identity it carries.
     * Called server-to-server by the originating Local instance, never by a
     * browser - possession of the (short-lived, single-use) token is itself
     * the authorization, the same trust model as an OAuth authorization
     * code.
     */
    public async resolve(
        exchangeToken: string,
    ): Promise<ResolvedGitHubIdentity> {
        const token = await this.exchangeTokenRepository.consume(
            sha256(exchangeToken),
        );

        if (!token) {
            throw new ApiError(
                "INVALID_EXCHANGE_TOKEN",
                "This GitHub login token is invalid or was already used.",
                410,
            );
        }

        if (Date.parse(token.expiresAt) <= Date.now()) {
            throw new ApiError(
                "EXCHANGE_TOKEN_EXPIRED",
                "This GitHub login token has expired.",
                410,
            );
        }

        return {
            githubId: token.githubId,
            githubUsername: token.githubUsername,
            email: token.email,
            name: token.name,
        };
    }
}

function withError(returnTo: string, message: string): string {
    const url = new URL(returnTo);

    url.searchParams.set("error", message);

    return url.toString();
}
