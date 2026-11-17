import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

const githubRequest = vi.hoisted(() => vi.fn());
const githubGraphql = vi.hoisted(() => vi.fn());

vi.mock("@/github/app-auth/github-api", () => ({
    githubRequest,
    githubGraphql,
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
        ["listBranches", ["t", "o", "r"], "/repos/o/r/branches?per_page=100&page=1"],
        ["listBranches", ["t", "o", "r", 3], "/repos/o/r/branches?per_page=100&page=3"],
        ["listIssues", ["t", "o", "r", "open", 2, 30], "/repos/o/r/issues?state=open&sort=updated&direction=desc&per_page=30&page=2"],
        ["listIssues", ["t", "o", "r", "all", 1, 10, "2026-01-01T00:00:00.000Z"], "/repos/o/r/issues?state=all&sort=updated&direction=desc&per_page=10&page=1&since=2026-01-01T00%3A00%3A00.000Z"],
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

    it("posts a comment as an issue comment", async () => {
        await client.createComment("t", "o", "r", 7, "Hi");

        expect(githubRequest).toHaveBeenCalledWith("/repos/o/r/issues/7/comments", {
            method: "POST",
            token: "t",
            body: { body: "Hi" },
        });
    });

    it("merges with the method, and only the options it was given", async () => {
        await client.mergePullRequest("t", "o", "r", 7, { method: "rebase" });
        await client.mergePullRequest("t", "o", "r", 7, {
            method: "squash",
            commitTitle: "T",
            commitMessage: "M",
            expectedHeadSha: "abc1234",
        });

        expect(githubRequest).toHaveBeenNthCalledWith(1, "/repos/o/r/pulls/7/merge", {
            method: "PUT",
            token: "t",
            body: { merge_method: "rebase" },
        });
        expect(githubRequest).toHaveBeenNthCalledWith(2, "/repos/o/r/pulls/7/merge", {
            method: "PUT",
            token: "t",
            body: { merge_method: "squash", commit_title: "T", commit_message: "M", sha: "abc1234" },
        });
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

    it("asks for the checks of several commits in one GraphQL query and maps them to the REST shapes", async () => {
        githubGraphql.mockResolvedValue({
            repository: {
                c0: {
                    statusCheckRollup: {
                        contexts: {
                            nodes: [
                                { __typename: "CheckRun", name: "build", status: "COMPLETED", conclusion: "SUCCESS", detailsUrl: "https://ci/1", startedAt: "2026-01-01T00:00:00Z", completedAt: "2026-01-01T00:01:00Z" },
                                { __typename: "StatusContext", context: "ci/legacy", state: "PENDING", targetUrl: null, description: "waiting" },
                            ],
                        },
                    },
                },
                c1: { statusCheckRollup: null },
                c2: null,
            },
        });

        const result = await client.getChecksOfRefs("t", "o", "r", ["abc", "def", "ghi"]);

        const [query, variables, token] = githubGraphql.mock.calls[0]!;
        expect(token).toBe("t");
        expect(variables).toEqual({ owner: "o", name: "r", ref0: "abc", ref1: "def", ref2: "ghi" });
        expect(query).toContain("$ref0: String!");
        expect(query).toContain("c2: object(expression: $ref2)");
        expect(result.abc).toEqual({
            checkRuns: {
                total_count: 1,
                check_runs: [{ name: "build", status: "completed", conclusion: "success", html_url: "https://ci/1", started_at: "2026-01-01T00:00:00Z", completed_at: "2026-01-01T00:01:00Z" }],
            },
            combined: { state: "", statuses: [{ context: "ci/legacy", state: "pending", target_url: null, description: "waiting" }] },
        });
        // A commit without checks has an empty result, one GitHub cannot find is null.
        expect(result.def).toEqual({ checkRuns: { total_count: 0, check_runs: [] }, combined: { state: "", statuses: [] } });
        expect(result.ghi).toBeNull();
    });

    it("treats a missing repository in the answer as every ref unknown", async () => {
        githubGraphql.mockResolvedValue({ repository: null });

        expect(await client.getChecksOfRefs("t", "o", "r", ["abc"])).toEqual({ abc: null });
    });
});
