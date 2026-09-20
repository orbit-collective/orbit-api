import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

vi.mock(
    "@/github/app-auth/github-app.config",
    () => ({
        getGitHubAppConfig:
            () => ({
                slug:
                    "orbit-project-management",
            }),
    }),
);

const {
    createGitHubInstallationUrl,
} = await import(
    "@/github/installations/github-installation-url"
    );

describe(
    "createGitHubInstallationUrl",
    () => {
        it(
            "builds the app installation url with the state parameter",
            () => {
                expect(
                    createGitHubInstallationUrl(
                        "state token",
                    ),
                ).toBe(
                    "https://github.com/apps/orbit-project-management/installations/new?state=state+token",
                );
            },
        );
    },
);
