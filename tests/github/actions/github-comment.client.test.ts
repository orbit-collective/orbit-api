import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

const githubRequest =
    vi.hoisted(
        () => vi.fn(),
    );

vi.mock(
    "@/github/app-auth/github-api",
    () => ({
        githubRequest,
    }),
);

const {
    GitHubCommentClient,
} = await import(
    "@/github/actions/github-comment.client"
    );

beforeEach(
    () => {
        githubRequest.mockReset();
    },
);

describe(
    "GitHubCommentClient",
    () => {
        it(
            "posts a comment on the pull request issue",
            async () => {
                githubRequest
                    .mockResolvedValue({
                        id: 1,
                    });

                const result =
                    await new GitHubCommentClient()
                        .create(
                            "token",
                            "orbit-collective",
                            "orbit",
                            7,
                            "hello",
                        );

                expect(
                    result,
                ).toEqual({
                    id: 1,
                });

                expect(
                    githubRequest,
                ).toHaveBeenCalledWith(
                    "/repos/orbit-collective/orbit/issues/7/comments",
                    {
                        method: "POST",

                        token: "token",

                        body: {
                            body: "hello",
                        },
                    },
                );
            },
        );

        it(
            "encodes owner and repository segments",
            async () => {
                githubRequest
                    .mockResolvedValue({
                        id: 2,
                    });

                await new GitHubCommentClient()
                    .create(
                        "token",
                        "orbit owner",
                        "orbit/repo",
                        9,
                        "hello",
                    );

                expect(
                    githubRequest.mock
                        .calls[0]![0],
                ).toBe(
                    "/repos/orbit%20owner/orbit%2Frepo/issues/9/comments",
                );
            },
        );
    },
);
