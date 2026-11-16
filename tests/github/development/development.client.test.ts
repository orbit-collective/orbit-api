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

const { GitHubDevelopmentClient } = await import(
    "@/github/development/development.client"
);

const client = new GitHubDevelopmentClient();

beforeEach(() => {
    githubRequest.mockReset().mockResolvedValue([]);
});

describe("GitHubDevelopmentClient", () => {
    it.each([
        ["getRepository", ["t", "o", "r"], "/repos/o/r"],
        ["listPullRequests", ["t", "o", "r", "open", 2, 30], "/repos/o/r/pulls?state=open&sort=updated&direction=desc&per_page=30&page=2"],
        ["getPullRequest", ["t", "o", "r", 5], "/repos/o/r/pulls/5"],
        ["listPullRequestReviews", ["t", "o", "r", 5], "/repos/o/r/pulls/5/reviews?per_page=100"],
        ["listPullRequestCommits", ["t", "o", "r", 5], "/repos/o/r/pulls/5/commits?per_page=100"],
        ["listCommits", ["t", "o", "r", undefined, 1, 20], "/repos/o/r/commits?per_page=20&page=1"],
        ["listCommits", ["t", "o", "r", "feat/x", 1, 20], "/repos/o/r/commits?per_page=20&page=1&sha=feat%2Fx"],
        ["listBranches", ["t", "o", "r"], "/repos/o/r/branches?per_page=100"],
        ["getCheckRuns", ["t", "o", "r", "abc"], "/repos/o/r/commits/abc/check-runs?per_page=100"],
        ["getCombinedStatus", ["t", "o", "r", "abc"], "/repos/o/r/commits/abc/status"],
        ["listContributors", ["t", "o", "r"], "/repos/o/r/contributors?per_page=10"],
        ["getLanguages", ["t", "o", "r"], "/repos/o/r/languages"],
        ["getCommitActivity", ["t", "o", "r"], "/repos/o/r/stats/commit_activity"],
    ])("%s reads %s", async (method, args, path) => {
        await (client as never as Record<string, (...a: unknown[]) => Promise<unknown>>)[method]!(
            ...args,
        );

        expect(githubRequest).toHaveBeenCalledWith(path, { token: "t" });
    });

    it("patches a pull request", async () => {
        await client.updatePullRequest("t", "o", "r", 5, { state: "closed" });

        expect(githubRequest).toHaveBeenCalledWith("/repos/o/r/pulls/5", {
            method: "PATCH",
            token: "t",
            body: { state: "closed" },
        });
    });

    it("encodes owner and repository segments", async () => {
        await client.getRepository("t", "o/x", "r y");

        expect(githubRequest).toHaveBeenCalledWith("/repos/o%2Fx/r%20y", {
            token: "t",
        });
    });
});
