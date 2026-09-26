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
                appId: "123456",

                slug: "orbit",

                clientId: "client-id",

                clientSecret:
                    "client-secret",

                privateKey: "key",

                apiBaseUrl:
                    "https://api.github.test",

                apiVersion:
                    "2026-03-10",

                callbackUrl:
                    "https://orbit.test/callback",
            }),
    }),
);

const {
    githubRequest,
} = await import(
    "@/github/app-auth/github-api"
    );

const fetchMock = vi.fn();

beforeEach(
    () => {
        fetchMock.mockReset();

        vi.stubGlobal(
            "fetch",
            fetchMock,
        );

        vi.spyOn(
            console,
            "error",
        ).mockImplementation(
            () => undefined,
        );
    },
);

afterEach(
    () => {
        vi.unstubAllGlobals();

        vi.restoreAllMocks();
    },
);

describe(
    "githubRequest",
    () => {
        it(
            "performs a GET request with app headers",
            async () => {
                fetchMock
                    .mockResolvedValue(
                        new Response(
                            JSON.stringify({
                                id: 1,
                            }),
                            {
                                status: 200,
                            },
                        ),
                    );

                const result =
                    await githubRequest<{
                        id: number;
                    }>(
                        "/app",
                        {
                            token: "jwt",
                        },
                    );

                expect(
                    result,
                ).toEqual({
                    id: 1,
                });

                const [
                    url,
                    init,
                ] = fetchMock.mock
                    .calls[0]!;

                expect(url).toBe(
                    "https://api.github.test/app",
                );

                expect(
                    init.method,
                ).toBe("GET");

                expect(
                    init.headers,
                ).toMatchObject({
                    Accept:
                        "application/vnd.github+json",

                    Authorization:
                        "Bearer jwt",

                    "X-GitHub-Api-Version":
                        "2026-03-10",

                    "User-Agent":
                        "Orbit-API",
                });

                expect(
                    init.headers,
                ).not.toHaveProperty(
                    "Content-Type",
                );
            },
        );

        it(
            "serialises a json body for write requests",
            async () => {
                fetchMock
                    .mockResolvedValue(
                        new Response(
                            JSON.stringify({
                                id: 2,
                            }),
                            {
                                status: 201,
                            },
                        ),
                    );

                await githubRequest(
                    "/repos/orbit/orbit/issues/7/comments",
                    {
                        method: "POST",

                        token: "token",

                        body: {
                            body: "hello",
                        },
                    },
                );

                const [
                    ,
                    init,
                ] = fetchMock.mock
                    .calls[0]!;

                expect(
                    init.headers[
                        "Content-Type"
                        ],
                ).toBe(
                    "application/json",
                );

                expect(
                    init.body,
                ).toBe(
                    JSON.stringify({
                        body: "hello",
                    }),
                );
            },
        );

        it(
            "returns undefined for empty responses",
            async () => {
                fetchMock
                    .mockResolvedValue(
                        new Response(
                            null,
                            {
                                status: 204,
                            },
                        ),
                    );

                expect(
                    await githubRequest(
                        "/app",
                        {
                            token: "jwt",
                        },
                    ),
                ).toBeUndefined();
            },
        );

        it(
            "maps a failed response to an api error",
            async () => {
                fetchMock
                    .mockResolvedValue(
                        new Response(
                            "forbidden",
                            {
                                status: 403,

                                headers: {
                                    "X-Accepted-GitHub-Permissions":
                                        "issues=write",
                                },
                            },
                        ),
                    );

                await expect(
                    githubRequest(
                        "/app",
                        {
                            token: "jwt",
                        },
                    ),
                ).rejects.toMatchObject({
                    code:
                        "GITHUB_API_ERROR",

                    status: 502,
                });
            },
        );

        it(
            "extracts GitHub's own safe top-level message from a JSON error body",
            async () => {
                fetchMock.mockResolvedValue(
                    new Response(
                        JSON.stringify({
                            message: "Validation Failed",
                            errors: [{ resource: "PullRequest", code: "custom" }],
                        }),
                        { status: 422 },
                    ),
                );

                await expect(
                    githubRequest("/repos/o/r/pulls", {
                        method: "POST",
                        token: "jwt",
                        body: {},
                    }),
                ).rejects.toMatchObject({
                    code: "GITHUB_API_ERROR",
                    githubStatus: 422,
                    githubMessage: "Validation Failed",
                });
            },
        );

        it(
            "leaves githubMessage undefined for a non-JSON error body",
            async () => {
                fetchMock.mockResolvedValue(
                    new Response("Internal Server Error", { status: 500 }),
                );

                await expect(
                    githubRequest("/app", { token: "jwt" }),
                ).rejects.toMatchObject({
                    code: "GITHUB_API_ERROR",
                    githubMessage: undefined,
                });
            },
        );
    },
);
