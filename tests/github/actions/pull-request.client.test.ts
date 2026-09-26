import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

const githubRequest = vi.hoisted(() => vi.fn());

vi.mock("@/github/app-auth/github-api", () => ({
    githubRequest,
}));

const { GitHubPullRequestClient } = await import(
    "@/github/actions/pull-request.client"
);

beforeEach(() => {
    githubRequest.mockReset();
});

describe("GitHubPullRequestClient", () => {
    it("creates a pull request", async () => {
        githubRequest.mockResolvedValue({
            number: 51,
            html_url: "https://github.com/orbit-collective/orbit/pull/51",
            title: "Fix login redirect",
        });

        const result = await new GitHubPullRequestClient().create(
            "token",
            "orbit-collective",
            "orbit",
            "Fix login redirect",
            "fix/login-redirect",
            "main",
            "<!-- orbit-issue:1 -->",
        );

        expect(result.number).toBe(51);
        expect(githubRequest).toHaveBeenCalledWith(
            "/repos/orbit-collective/orbit/pulls",
            {
                method: "POST",
                token: "token",
                body: {
                    title: "Fix login redirect",
                    head: "fix/login-redirect",
                    base: "main",
                    body: "<!-- orbit-issue:1 -->",
                },
            },
        );
    });

    it("encodes owner and repository segments", async () => {
        githubRequest.mockResolvedValue({
            number: 1,
            html_url: "https://example.com",
            title: "x",
        });

        await new GitHubPullRequestClient().create(
            "token",
            "orbit owner",
            "orbit/repo",
            "x",
            "a",
            "b",
            "",
        );

        expect(githubRequest.mock.calls[0]![0]).toBe(
            "/repos/orbit%20owner/orbit%2Frepo/pulls",
        );
    });
});
