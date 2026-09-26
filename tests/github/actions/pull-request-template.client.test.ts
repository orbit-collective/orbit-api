import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    ApiError,
} from "@/shared/errors";

const githubRequest = vi.hoisted(() => vi.fn());

vi.mock("@/github/app-auth/github-api", () => ({
    githubRequest,
}));

const { GitHubPullRequestTemplateClient } = await import(
    "@/github/actions/pull-request-template.client"
);

beforeEach(() => {
    githubRequest.mockReset();
});

function notFound() {
    return new ApiError(
        "GITHUB_API_ERROR",
        "GitHub API request failed.",
        502,
        404,
    );
}

describe("GitHubPullRequestTemplateClient", () => {
    it("returns the decoded content of the first template path it finds", async () => {
        githubRequest
            .mockRejectedValueOnce(notFound())
            .mockResolvedValueOnce({
                content: Buffer.from("## Summary\n").toString("base64"),
                encoding: "base64",
            });

        const result = await new GitHubPullRequestTemplateClient().find(
            "token",
            "orbit-collective",
            "orbit",
        );

        expect(result).toBe("## Summary\n");
        expect(githubRequest).toHaveBeenCalledTimes(2);
        expect(githubRequest.mock.calls[0]![0]).toBe(
            "/repos/orbit-collective/orbit/contents/.github/pull_request_template.md",
        );
        expect(githubRequest.mock.calls[1]![0]).toBe(
            "/repos/orbit-collective/orbit/contents/.github/PULL_REQUEST_TEMPLATE.md",
        );
    });

    it("returns null when none of the well-known paths exist", async () => {
        githubRequest.mockRejectedValue(notFound());

        const result = await new GitHubPullRequestTemplateClient().find(
            "token",
            "orbit-collective",
            "orbit",
        );

        expect(result).toBeNull();
        expect(githubRequest).toHaveBeenCalledTimes(6);
    });

    it("does not swallow an unrelated GitHub failure", async () => {
        githubRequest.mockRejectedValue(
            new ApiError("GITHUB_API_ERROR", "GitHub API request failed.", 502, 500),
        );

        await expect(
            new GitHubPullRequestTemplateClient().find(
                "token",
                "orbit-collective",
                "orbit",
            ),
        ).rejects.toMatchObject({ code: "GITHUB_API_ERROR" });

        expect(githubRequest).toHaveBeenCalledTimes(1);
    });
});
