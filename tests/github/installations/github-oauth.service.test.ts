import {
    afterEach,
    beforeEach,
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
                clientId: "client-id",

                clientSecret:
                    "client-secret",

                callbackUrl:
                    "https://orbit.test/callback",
            }),
    }),
);

const {
    GitHubOAuthService,
} = await import(
    "@/github/installations/github-oauth.service"
    );

const fetchMock = vi.fn();

beforeEach(
    () => {
        fetchMock.mockReset();

        vi.stubGlobal(
            "fetch",
            fetchMock,
        );
    },
);

afterEach(
    () => {
        vi.unstubAllGlobals();
    },
);

describe(
    "GitHubOAuthService",
    () => {
        it(
            "exchanges the code for a user access token",
            async () => {
                fetchMock
                    .mockResolvedValue(
                        new Response(
                            JSON.stringify({
                                access_token:
                                    "gho_token",

                                token_type:
                                    "bearer",

                                scope: "",
                            }),
                            {
                                status: 200,
                            },
                        ),
                    );

                const token =
                    await new GitHubOAuthService()
                        .exchangeCode(
                            "code",
                        );

                expect(token).toBe(
                    "gho_token",
                );

                const [
                    url,
                    init,
                ] = fetchMock.mock
                    .calls[0]!;

                expect(url).toBe(
                    "https://github.com/login/oauth/access_token",
                );

                expect(
                    JSON.parse(
                        init.body,
                    ),
                ).toEqual({
                    client_id:
                        "client-id",

                    client_secret:
                        "client-secret",

                    code: "code",

                    redirect_uri:
                        "https://orbit.test/callback",
                });
            },
        );

        it(
            "fails when github rejects the request",
            async () => {
                fetchMock
                    .mockResolvedValue(
                        new Response(
                            "error",
                            {
                                status: 500,
                            },
                        ),
                    );

                await expect(
                    new GitHubOAuthService()
                        .exchangeCode(
                            "code",
                        ),
                ).rejects.toMatchObject({
                    code:
                        "GITHUB_OAUTH_ERROR",

                    status: 502,
                });
            },
        );

        it(
            "fails when github returns an oauth error",
            async () => {
                fetchMock
                    .mockResolvedValue(
                        new Response(
                            JSON.stringify({
                                error:
                                    "bad_verification_code",
                            }),
                            {
                                status: 200,
                            },
                        ),
                    );

                await expect(
                    new GitHubOAuthService()
                        .exchangeCode(
                            "code",
                        ),
                ).rejects.toMatchObject({
                    code:
                        "GITHUB_OAUTH_ERROR",

                    status: 401,
                });
            },
        );

        it(
            "fails when the access token is missing",
            async () => {
                fetchMock
                    .mockResolvedValue(
                        new Response(
                            JSON.stringify({
                                token_type:
                                    "bearer",
                            }),
                            {
                                status: 200,
                            },
                        ),
                    );

                await expect(
                    new GitHubOAuthService()
                        .exchangeCode(
                            "code",
                        ),
                ).rejects.toMatchObject({
                    code:
                        "GITHUB_OAUTH_ERROR",

                    status: 401,
                });
            },
        );
    },
);
