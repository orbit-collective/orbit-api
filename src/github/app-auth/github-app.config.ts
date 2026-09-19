import { env } from "@/shared/env";

export interface GitHubAppConfig {
    appId: string;
    privateKey: string;
    apiBaseUrl: string;
    apiVersion: string;
}

export function getGitHubAppConfig(): GitHubAppConfig {
    return {
        appId: env("GITHUB_APP_ID"),

        privateKey: normalizePrivateKey(
            env("GITHUB_PRIVATE_KEY"),
        ),

        apiBaseUrl:
            process.env.GITHUB_API_URL ??
            "https://api.github.com",

        apiVersion:
            process.env.GITHUB_API_VERSION ??
            "2026-03-10",
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