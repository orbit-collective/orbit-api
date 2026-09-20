import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

const mocks =
    vi.hoisted(
        () => ({
            githubRequest:
                vi.fn(),

            createGitHubAppJwt:
                vi.fn(),
        }),
    );

vi.mock(
    "@/github/app-auth/github-api",
    () => ({
        githubRequest:
            mocks.githubRequest,
    }),
);

vi.mock(
    "@/github/app-auth/github-app-jwt",
    () => ({
        createGitHubAppJwt:
            mocks.createGitHubAppJwt,
    }),
);

const {
    GitHubAppService,
} = await import(
    "@/github/app-auth/github-app.service"
    );

const {
    InstallationTokenService,
} = await import(
    "@/github/app-auth/installation-token.service"
    );

beforeEach(
    () => {
        mocks.githubRequest
            .mockReset();

        mocks.createGitHubAppJwt
            .mockReset()
            .mockResolvedValue("jwt");
    },
);

describe(
    "GitHubAppService",
    () => {
        it(
            "reads the authenticated app with an app jwt",
            async () => {
                mocks.githubRequest
                    .mockResolvedValue({
                        id: 1,

                        slug: "orbit",
                    });

                const app =
                    await new GitHubAppService()
                        .getAuthenticatedApp();

                expect(
                    app.slug,
                ).toBe("orbit");

                expect(
                    mocks.githubRequest,
                ).toHaveBeenCalledWith(
                    "/app",
                    {
                        token: "jwt",
                    },
                );
            },
        );
    },
);

describe(
    "InstallationTokenService",
    () => {
        it(
            "creates an installation access token",
            async () => {
                mocks.githubRequest
                    .mockResolvedValue({
                        token:
                            "ghs_token",
                    });

                const result =
                    await new InstallationTokenService()
                        .create(123);

                expect(
                    result.token,
                ).toBe("ghs_token");

                expect(
                    mocks.githubRequest,
                ).toHaveBeenCalledWith(
                    "/app/installations/123/access_tokens",
                    {
                        method: "POST",

                        token: "jwt",
                    },
                );
            },
        );
    },
);
