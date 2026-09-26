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

const { GitHubBranchClient } = await import("@/github/actions/branch.client");

beforeEach(() => {
    githubRequest.mockReset();
});

describe("GitHubBranchClient", () => {
    it("fetches the repository's default branch", async () => {
        githubRequest.mockResolvedValue({ default_branch: "main" });

        const result = await new GitHubBranchClient().getDefaultBranch(
            "token",
            "orbit-collective",
            "orbit",
        );

        expect(result).toBe("main");
        expect(githubRequest).toHaveBeenCalledWith(
            "/repos/orbit-collective/orbit",
            { token: "token" },
        );
    });

    it("fetches a branch's current SHA", async () => {
        githubRequest.mockResolvedValue({
            ref: "refs/heads/main",
            object: { sha: "abc123" },
        });

        const result = await new GitHubBranchClient().getBranchSha(
            "token",
            "orbit-collective",
            "orbit",
            "main",
        );

        expect(result).toBe("abc123");
        expect(githubRequest).toHaveBeenCalledWith(
            "/repos/orbit-collective/orbit/git/ref/heads/main",
            { token: "token" },
        );
    });

    it("creates a branch ref from a name and SHA", async () => {
        githubRequest.mockResolvedValue({
            ref: "refs/heads/1234-fix-login",
            object: { sha: "abc123" },
        });

        const result = await new GitHubBranchClient().create(
            "token",
            "orbit-collective",
            "orbit",
            "1234-fix-login",
            "abc123",
        );

        expect(result.ref).toBe("refs/heads/1234-fix-login");
        expect(githubRequest).toHaveBeenCalledWith(
            "/repos/orbit-collective/orbit/git/refs",
            {
                method: "POST",
                token: "token",
                body: { ref: "refs/heads/1234-fix-login", sha: "abc123" },
            },
        );
    });

    it("encodes owner and repository segments", async () => {
        githubRequest.mockResolvedValue({ default_branch: "main" });

        await new GitHubBranchClient().getDefaultBranch(
            "token",
            "orbit owner",
            "orbit/repo",
        );

        expect(githubRequest.mock.calls[0]![0]).toBe(
            "/repos/orbit%20owner/orbit%2Frepo",
        );
    });
});
