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

            createToken:
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
    "@/github/app-auth/installation-token.service",
    () => ({
        InstallationTokenService:
            class {
                public create =
                    mocks.createToken;
            },
    }),
);

const {
    GitHubInstallationService,
} = await import(
    "@/github/installations/github-installation.service"
    );

beforeEach(
    () => {
        mocks.githubRequest
            .mockReset();

        mocks.createToken
            .mockReset();
    },
);

describe(
    "GitHubInstallationService",
    () => {
        it(
            "returns the installation accessible to the user",
            async () => {
                mocks.githubRequest
                    .mockResolvedValue({
                        total_count: 2,

                        installations: [
                            {
                                id: 1,
                            },
                            {
                                id: 123,
                            },
                        ],
                    });

                const installation =
                    await new GitHubInstallationService()
                        .findInstallationForUser(
                            "gho_token",
                            123,
                        );

                expect(
                    installation.id,
                ).toBe(123);

                expect(
                    mocks.githubRequest,
                ).toHaveBeenCalledWith(
                    "/user/installations",
                    {
                        token:
                            "gho_token",
                    },
                );
            },
        );

        it(
            "rejects an installation the user cannot access",
            async () => {
                mocks.githubRequest
                    .mockResolvedValue({
                        total_count: 0,

                        installations: [],
                    });

                await expect(
                    new GitHubInstallationService()
                        .findInstallationForUser(
                            "gho_token",
                            123,
                        ),
                ).rejects.toMatchObject({
                    code:
                        "INSTALLATION_NOT_ACCESSIBLE",

                    status: 403,
                });
            },
        );

        it(
            "lists installation repositories with an installation token",
            async () => {
                mocks.createToken
                    .mockResolvedValue({
                        token:
                            "ghs_token",
                    });

                mocks.githubRequest
                    .mockResolvedValue({
                        total_count: 1,

                        repositories: [
                            {
                                id: 456,

                                name: "orbit",
                            },
                        ],
                    });

                const repositories =
                    await new GitHubInstallationService()
                        .listRepositories(
                            123,
                        );

                expect(
                    repositories,
                ).toHaveLength(1);

                expect(
                    mocks.createToken,
                ).toHaveBeenCalledWith(
                    123,
                );

                expect(
                    mocks.githubRequest,
                ).toHaveBeenCalledWith(
                    "/installation/repositories?per_page=100",
                    {
                        token:
                            "ghs_token",
                    },
                );
            },
        );
    },
);
