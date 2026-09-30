import {
    ApiError,
} from "@/shared/errors";

import {
    getGitHubAppConfig,
} from "@/github/app-auth/github-app.config";

import type {
    GitHubUserAccessTokenResponse,
} from "./github-oauth.types";

export class GitHubOAuthService {
    public async exchangeCode(
        code: string,
        redirectUri?: string,
    ): Promise<string> {
        const config =
            getGitHubAppConfig();

        const response =
            await fetch(
                "https://github.com/login/oauth/access_token",
                {
                    method: "POST",

                    headers: {
                        Accept:
                            "application/json",

                        "Content-Type":
                            "application/json",

                        "User-Agent":
                            "Orbit-API",
                    },

                    body:
                        JSON.stringify({
                            client_id:
                            config.clientId,

                            client_secret:
                            config.clientSecret,

                            code,

                            redirect_uri:
                            redirectUri ??
                            config.callbackUrl,
                        }),
                },
            );

        if (!response.ok) {
            const rawBody =
                await response.text();

            // Logged in full server-side only - never returned to the
            // caller, mirroring githubRequest()'s own convention.
            console.error(
                "GitHub OAuth token exchange failed",
                {
                    status: response.status,
                    body: rawBody,
                },
            );

            throw new ApiError(
                "GITHUB_OAUTH_ERROR",
                "GitHub OAuth authorization failed.",
                502,
            );
        }

        const result =
            await response.json() as
                GitHubUserAccessTokenResponse & {
                error?: string;
                error_description?: string;
            };

        if (
            result.error ||
            !result.access_token
        ) {
            // GitHub's token endpoint answers 200 OK even on failure (e.g.
            // "redirect_uri_mismatch", "bad_verification_code") - the only
            // signal is this JSON body, so it has to be logged here rather
            // than relying on the HTTP status above.
            console.error(
                "GitHub OAuth token exchange rejected",
                {
                    error:
                        result.error,

                    description:
                        result.error_description,
                },
            );

            throw new ApiError(
                "GITHUB_OAUTH_ERROR",
                "GitHub OAuth authorization failed.",
                401,
            );
        }

        return result.access_token;
    }
}