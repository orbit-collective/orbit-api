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
                            config.callbackUrl,
                        }),
                },
            );

        if (!response.ok) {
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
            };

        if (
            result.error ||
            !result.access_token
        ) {
            throw new ApiError(
                "GITHUB_OAUTH_ERROR",
                "GitHub OAuth authorization failed.",
                401,
            );
        }

        return result.access_token;
    }
}