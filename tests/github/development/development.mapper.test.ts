import {
    describe,
    expect,
    it,
} from "vitest";

import {
    summariseCi,
    summariseReviews,
    toBranch,
    toCommit,
    toPullRequest,
    toPullRequestDetail,
} from "@/github/development/development.mapper";

import type {
    GitHubCheckRun,
    GitHubPullRequestDetail,
    GitHubPullRequestSummary,
} from "@/github/development/development.types";

function pullRequest(
    overrides: Partial<GitHubPullRequestSummary> = {},
): GitHubPullRequestSummary {
    return {
        id: 9007,
        number: 7,
        title: "Add login",
        state: "open",
        draft: false,
        merged_at: null,
        html_url: "https://github.com/o/r/pull/7",
        body: null,
        user: { login: "ada", avatar_url: "https://a/1.png" },
        head: { ref: "feat/login", sha: "abc" },
        base: { ref: "main" },
        labels: [{ name: "bug", color: "ff0000" }],
        requested_reviewers: [
            { login: "bob", avatar_url: "https://a/2.png" },
        ],
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-02T00:00:00Z",
        closed_at: null,
        ...overrides,
    };
}

function run(
    overrides: Partial<GitHubCheckRun> = {},
): GitHubCheckRun {
    return {
        name: "build",
        status: "completed",
        conclusion: "success",
        html_url: "https://github.com/run/1",
        started_at: "2026-01-01T00:00:00Z",
        completed_at: "2026-01-01T00:01:30Z",
        ...overrides,
    };
}

const noStatuses = { state: "pending", statuses: [] };

describe("toPullRequest", () => {
    it("maps the payload and defaults a missing body to an empty string", () => {
        const dto = toPullRequest(pullRequest());

        expect(dto).toMatchObject({
            id: 9007,
            number: 7,
            state: "open",
            draft: false,
            body: "",
            headBranch: "feat/login",
            headSha: "abc",
            baseBranch: "main",
            author: { login: "ada", avatarUrl: "https://a/1.png" },
            requestedReviewers: [{ login: "bob" }],
            ci: null,
        });
    });

    it("reports a closed pull request with merged_at as merged", () => {
        const dto = toPullRequest(
            pullRequest({
                state: "closed",
                merged_at: "2026-01-03T00:00:00Z",
            }),
        );

        expect(dto.state).toBe("merged");
        expect(dto.mergedAt).toBe("2026-01-03T00:00:00Z");
    });

    it("keeps a closed-unmerged pull request as closed and tolerates no author", () => {
        const dto = toPullRequest(
            pullRequest({ state: "closed", user: null }),
        );

        expect(dto.state).toBe("closed");
        expect(dto.author).toBeNull();
    });
});

describe("toCommit", () => {
    it("keeps only the subject line and falls back to the login for the name", () => {
        const dto = toCommit({
            sha: "deadbeef",
            html_url: "https://github.com/o/r/commit/deadbeef",
            commit: {
                message: "fix: thing\n\nlong body",
                author: null,
            },
            author: { login: "ada", avatar_url: "u" },
        });

        expect(dto.message).toBe("fix: thing");
        expect(dto.authorName).toBe("ada");
        expect(dto.committedAt).toBeNull();
    });
});

describe("toBranch", () => {
    it("flags the default branch", () => {
        const branch = {
            name: "main",
            protected: true,
            commit: { sha: "s" },
        };

        expect(toBranch(branch, "main").isDefault).toBe(true);
        expect(toBranch(branch, "dev").isDefault).toBe(false);
    });
});

describe("summariseReviews", () => {
    const ada = { login: "ada", avatar_url: "u" };
    const bob = { login: "bob", avatar_url: "u" };

    it("is none without a verdict", () => {
        expect(summariseReviews([])).toBe("none");
        expect(
            summariseReviews([{ user: ada, state: "PENDING" }]),
        ).toBe("none");
    });

    it("prefers changes requested over approvals", () => {
        expect(
            summariseReviews([
                { user: ada, state: "APPROVED" },
                { user: bob, state: "CHANGES_REQUESTED" },
            ]),
        ).toBe("changes_requested");
    });

    it("uses a reviewer's latest verdict and ignores a later plain comment", () => {
        expect(
            summariseReviews([
                { user: ada, state: "CHANGES_REQUESTED" },
                { user: ada, state: "APPROVED" },
                { user: ada, state: "COMMENTED" },
            ]),
        ).toBe("approved");
    });

    it("reports commented when that is all there is", () => {
        expect(
            summariseReviews([{ user: ada, state: "COMMENTED" }]),
        ).toBe("commented");
    });

    it("ignores a review without a user", () => {
        expect(
            summariseReviews([{ user: null, state: "APPROVED" }]),
        ).toBe("none");
    });
});

describe("summariseCi", () => {
    it("is none when the commit has no CI", () => {
        expect(
            summariseCi(
                { total_count: 0, check_runs: [] },
                noStatuses,
            ),
        ).toMatchObject({ state: "none", total: 0 });
    });

    it("passes when everything succeeded or was skipped, with a duration", () => {
        const summary = summariseCi(
            {
                total_count: 2,
                check_runs: [
                    run(),
                    run({ name: "lint", conclusion: "skipped" }),
                ],
            },
            noStatuses,
        );

        expect(summary.state).toBe("passed");
        expect(summary.passed).toBe(2);
        expect(summary.runs[0]?.durationSeconds).toBe(90);
    });

    it("fails when any run failed, even if others are pending", () => {
        const summary = summariseCi(
            {
                total_count: 2,
                check_runs: [
                    run({ conclusion: "failure" }),
                    run({ status: "in_progress", conclusion: null }),
                ],
            },
            noStatuses,
        );

        expect(summary.state).toBe("failed");
        expect(summary.failed).toBe(1);
        expect(summary.pending).toBe(1);
    });

    it("is pending while a run is still going, with no duration", () => {
        const summary = summariseCi(
            {
                total_count: 1,
                check_runs: [
                    run({
                        status: "in_progress",
                        conclusion: null,
                        completed_at: null,
                    }),
                ],
            },
            noStatuses,
        );

        expect(summary.state).toBe("pending");
        expect(summary.runs[0]?.durationSeconds).toBeNull();
    });

    it("counts legacy commit statuses next to check runs", () => {
        const summary = summariseCi(
            { total_count: 0, check_runs: [] },
            {
                state: "failure",
                statuses: [
                    {
                        context: "ci/legacy",
                        state: "error",
                        target_url: null,
                        description: null,
                    },
                    {
                        context: "ci/other",
                        state: "success",
                        target_url: "https://ci",
                        description: null,
                    },
                    {
                        context: "ci/slow",
                        state: "pending",
                        target_url: null,
                        description: null,
                    },
                ],
            },
        );

        expect(summary).toMatchObject({
            state: "failed",
            total: 3,
            failed: 1,
            passed: 1,
            pending: 1,
        });
    });

    it("treats an unknown conclusion as pending", () => {
        expect(
            summariseCi(
                {
                    total_count: 1,
                    check_runs: [run({ conclusion: "stale" })],
                },
                noStatuses,
            ).state,
        ).toBe("pending");
    });
});

describe("toPullRequestDetail", () => {
    it("adds statistics, reviews that carry a verdict and commits", () => {
        const detail: GitHubPullRequestDetail = {
            ...pullRequest(),
            additions: 10,
            deletions: 2,
            changed_files: 3,
            commits: 1,
            comments: 2,
            review_comments: 1,
        };

        const dto = toPullRequestDetail(
            detail,
            [
                {
                    user: { login: "bob", avatar_url: "u" },
                    state: "APPROVED",
                    submitted_at: "2026-01-02T00:00:00Z",
                },
                { user: null, state: "DISMISSED" },
            ],
            [],
            null,
        );

        expect(dto).toMatchObject({
            additions: 10,
            deletions: 2,
            changedFiles: 3,
            commitCount: 1,
            commentCount: 3,
            mergeableState: null,
            reviewState: "approved",
        });
        expect(dto.reviews).toHaveLength(1);
    });
});
