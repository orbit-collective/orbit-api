import {
    getGitHubAppConfig,
} from "@/github/app-auth/github-app.config";

export function createGitHubInstallationUrl(
    state: string,
): string {
    const config =
        getGitHubAppConfig();

    const url =
        new URL(
            `https://github.com/apps/${config.slug}/installations/new`,
        );

    url.searchParams.set(
        "state",
        state,
    );

    return url.toString();
}