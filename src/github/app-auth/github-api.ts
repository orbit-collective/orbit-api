import {
    ApiError,
} from "@/shared/errors";

import {
    getGitHubAppConfig,
} from "./github-app.config";

export interface GitHubRequestOptions {
    method?: string;

    token: string;

    body?: unknown;
}

export async function githubRequest<T>(
    path: string,
    options: GitHubRequestOptions,
): Promise<T> {
    const config =
        getGitHubAppConfig();

    const headers: Record<
        string,
        string
    > = {
        Accept:
            "application/vnd.github+json",

        Authorization:
            `Bearer ${options.token}`,

        "X-GitHub-Api-Version":
        config.apiVersion,

        "User-Agent":
            "Orbit-API",
    };

    const requestInit: RequestInit = {
        method:
            options.method ??
            "GET",

        headers,
    };

    if (
        options.body !==
        undefined
    ) {
        headers["Content-Type"] =
            "application/json";

        requestInit.body =
            JSON.stringify(
                options.body,
            );
    }

    const response =
        await fetch(
            `${config.apiBaseUrl}${path}`,
            requestInit,
        );

    if (!response.ok) {
        const rawBody =
            await response.text();

        const acceptedPermissions =
            response.headers.get(
                "X-Accepted-GitHub-Permissions",
            );

        // Logged in full server-side only - never returned to the caller,
        // which only ever gets the safe top-level `message` below (if
        // present) via ApiError.githubMessage.
        console.error(
            "GitHub API request failed",
            {
                path,
                status: response.status,
                acceptedPermissions,
                body: rawBody,
            },
        );

        let githubMessage: string | undefined;

        try {
            const parsed =
                JSON.parse(rawBody) as {
                    message?: unknown;
                };

            if (
                typeof parsed.message ===
                "string"
            ) {
                githubMessage =
                    parsed.message;
            }
        } catch {
            // Not JSON, or no `message` field - githubMessage stays undefined.
        }

        throw new ApiError(
            "GITHUB_API_ERROR",
            "GitHub API request failed.",
            502,
            response.status,
            githubMessage,
        );
    }

    if (
        response.status ===
        204
    ) {
        return undefined as T;
    }

    return await response.json() as T;
}