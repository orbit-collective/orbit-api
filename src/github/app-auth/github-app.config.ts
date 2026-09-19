import { env } from "@/shared/env";

export interface GitHubAppConfig {
    appId: string;
    slug: string;

    clientId: string;
    clientSecret: string;

    privateKey: string;

    apiBaseUrl: string;
    apiVersion: string;

    callbackUrl: string;
}

export function getGitHubAppConfig(): GitHubAppConfig {
    return {
        appId:
            env("GITHUB_APP_ID"),

        slug:
            env("GITHUB_APP_SLUG"),

        clientId:
            env("GITHUB_CLIENT_ID"),

        clientSecret:
            env("GITHUB_CLIENT_SECRET"),

        privateKey:
            normalizePrivateKey(
                env(
                    "GITHUB_PRIVATE_KEY",
                ),
            ),

        apiBaseUrl:
            process.env.GITHUB_API_URL ??
            "https://api.github.com",

        apiVersion:
            process.env
                .GITHUB_API_VERSION ??
            "2026-03-10",

        callbackUrl:
            env(
                "GITHUB_CALLBACK_URL",
            ),
    };
}

function normalizePrivateKey(
    value: string,
): string {
    return value.replace(
        /\\n/g,
        "\n",
    );
}