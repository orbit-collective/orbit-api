import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    clearBranchListCache,
    DevelopmentService,
} from "@/github/development/development.service";

import {
    ApiError,
} from "@/shared/errors";

import type {
    GitHubConnection,
} from "@/relay/connections/connection.model";

const connection = { id: "c" } as GitHubConnection;

const user = { login: "ada", avatar_url: "u" };

function summary(number: number, state: "open" | "closed" = "open") {
    return {
        id: number * 1000,
        number,
        title: `PR ${number}`,
        state,
        merged_at: null,
        html_url: `https://github.com/o/r/pull/${number}`,
        body: null,
        user,
        head: { ref: `b${number}`, sha: `sha${number}` },
        base: { ref: "main" },
        labels: [],
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        closed_at: null,
    };
}

function makeService(clientOverrides: Record<string, unknown> = {}) {
    const access = {
        authorize: vi.fn().mockResolvedValue({
            repository: { repositoryId: 1, owner: "o", name: "r" },
            token: "tok",
        }),
    };

    const client = {
        listPullRequests: vi.fn().mockResolvedValue([]),
        getPullRequest: vi.fn(),
        listPullRequestReviews: vi.fn().mockResolvedValue([]),
        listPullRequestCommits: vi.fn().mockResolvedValue([]),
        updatePullRequest: vi.fn(),
        listCommits: vi.fn().mockResolvedValue([]),
        listBranches: vi.fn().mockResolvedValue([]),
        listIssues: vi.fn().mockResolvedValue([]),
        getRepository: vi.fn().mockResolvedValue({
            full_name: "o/r",
            description: "d",
            html_url: "https://github.com/o/r",
            private: false,
            default_branch: "main",
            stargazers_count: 3,
            forks_count: 1,
            open_issues_count: 2,
            pushed_at: null,
        }),
        getCheckRuns: vi.fn().mockResolvedValue({ total_count: 0, check_runs: [] }),
        getCombinedStatus: vi.fn().mockResolvedValue({ state: "pending", statuses: [] }),
        listContributors: vi.fn().mockResolvedValue([]),
        getLanguages: vi.fn().mockResolvedValue({}),
        getCommitActivity: vi.fn().mockResolvedValue([]),
        ...clientOverrides,
    };

    return {
        service: new DevelopmentService(access as never, client as never),
        access,
        client,
    };
}

beforeEach(() => {
    clearBranchListCache();
});

describe("DevelopmentService", () => {
    it("authorises the repository before anything else", async () => {
        const { service, access, client } = makeService();
        access.authorize.mockRejectedValue(
            new ApiError("GITHUB_REPOSITORY_NOT_ALLOWED", "no", 403),
        );

        await expect(
            service.listPullRequests(connection, 9, "open", 1, 30),
        ).rejects.toMatchObject({ code: "GITHUB_REPOSITORY_NOT_ALLOWED" });

        expect(client.listPullRequests).not.toHaveBeenCalled();
    });

    it("lists pull requests with CI only for the open ones", async () => {
        const { service, client } = makeService({
            listPullRequests: vi
                .fn()
                .mockResolvedValue([summary(1), summary(2, "closed")]),
        });

        const result = await service.listPullRequests(connection, 1, "all", 1, 30);

        expect(result.pullRequests.map((pr) => pr.ci?.state ?? null)).toEqual(["none", null]);
        expect(client.getCheckRuns).toHaveBeenCalledTimes(1);
        expect(client.getCheckRuns).toHaveBeenCalledWith("tok", "o", "r", "sha1");
    });

    it("never fails a list because a CI lookup failed", async () => {
        const { service } = makeService({
            listPullRequests: vi.fn().mockResolvedValue([summary(1)]),
            getCheckRuns: vi
                .fn()
                .mockRejectedValue(new ApiError("GITHUB_API_ERROR", "x", 502)),
        });

        const { pullRequests: [pr] } = await service.listPullRequests(connection, 1, "open", 1, 30);

        expect(pr?.ci).toBeNull();
    });

    it("looks CI up for at most 20 open pull requests", async () => {
        const many = Array.from({ length: 30 }, (_, i) => summary(i + 1));
        const { service, client } = makeService({
            listPullRequests: vi.fn().mockResolvedValue(many),
        });

        await service.listPullRequests(connection, 1, "open", 1, 30);

        expect(client.getCheckRuns).toHaveBeenCalledTimes(20);
    });

    it("leaves CI out of a list on request, so the list does not wait for it", async () => {
        const { service, client } = makeService({
            listPullRequests: vi.fn().mockResolvedValue([summary(1)]),
        });

        const result = await service.listPullRequests(connection, 1, "open", 1, 30, undefined, false);

        expect(result.pullRequests[0]?.ci).toBeNull();
        expect(client.getCheckRuns).not.toHaveBeenCalled();
    });

    it("keeps only what was updated since the date and says whether more may follow", async () => {
        const at = (day: number) => `2026-01-${String(day).padStart(2, "0")}T00:00:00Z`;
        const dated = (n: number, day: number) => ({ ...summary(n), updated_at: at(day) });
        const { service } = makeService({
            listPullRequests: vi.fn().mockResolvedValue([dated(1, 20), dated(2, 12), dated(3, 5)]),
        });

        const full = await service.listPullRequests(connection, 1, "all", 1, 3, at(10), false);

        // A full page whose oldest entry is already out of range is the last one.
        expect(full.pullRequests.map((pr) => pr.number)).toEqual([1, 2]);
        expect(full.hasMore).toBe(false);

        const inside = await service.listPullRequests(connection, 1, "all", 1, 3, at(1), false);

        expect(inside.pullRequests).toHaveLength(3);
        expect(inside.hasMore).toBe(true);

        const short = await service.listPullRequests(connection, 1, "all", 1, 10, at(1), false);

        expect(short.hasMore).toBe(false);
    });

    it("has more whenever a full page comes back without a range", async () => {
        const { service } = makeService({
            listPullRequests: vi.fn().mockResolvedValue([summary(1), summary(2)]),
        });

        expect((await service.listPullRequests(connection, 1, "all", 1, 2, undefined, false)).hasMore).toBe(true);
        expect((await service.listPullRequests(connection, 1, "all", 1, 3, undefined, false)).hasMore).toBe(false);
    });

    it("reads CI of several refs at once, and a failing one is null", async () => {
        const { service } = makeService({
            getCheckRuns: vi.fn(async (_t: string, _o: string, _r: string, ref: string) => {
                if (ref === "bad") {
                    throw new ApiError("GITHUB_API_ERROR", "x", 502);
                }

                return { total_count: 0, check_runs: [] };
            }),
        });

        const checks = await service.getChecksBatch(connection, 1, ["a", "bad"]);

        expect(checks.a?.state).toBe("none");
        expect(checks.bad).toBeNull();
    });

    it("returns one pull request in detail with reviews, commits and CI", async () => {
        const { service } = makeService({
            getPullRequest: vi.fn().mockResolvedValue({
                ...summary(5),
                additions: 4,
                deletions: 1,
                changed_files: 2,
                commits: 1,
                comments: 0,
                review_comments: 0,
            }),
            listPullRequestReviews: vi
                .fn()
                .mockResolvedValue([{ user, state: "APPROVED" }]),
        });

        const detail = await service.getPullRequest(connection, 1, 5);

        expect(detail.reviewState).toBe("approved");
        expect(detail.additions).toBe(4);
        expect(detail.ci?.state).toBe("none");
    });

    it("updates only the fields it was given", async () => {
        const { service, client } = makeService({
            updatePullRequest: vi.fn().mockResolvedValue({ ...summary(5, "closed") }),
        });

        const result = await service.updatePullRequest(connection, {
            repositoryId: 1,
            number: 5,
            state: "closed",
        });

        expect(client.updatePullRequest).toHaveBeenCalledWith("tok", "o", "r", 5, {
            state: "closed",
        });
        expect(result.state).toBe("closed");

        await service.updatePullRequest(connection, {
            repositoryId: 1,
            number: 5,
            title: "T",
            body: "B",
        });

        expect(client.updatePullRequest).toHaveBeenLastCalledWith("tok", "o", "r", 5, {
            title: "T",
            body: "B",
        });
    });

    it("surfaces GitHub's own message when it rejects an update", async () => {
        const { service } = makeService({
            updatePullRequest: vi
                .fn()
                .mockRejectedValue(
                    new ApiError("GITHUB_API_ERROR", "x", 502, 422, "Validation Failed"),
                ),
        });

        await expect(
            service.updatePullRequest(connection, {
                repositoryId: 1,
                number: 5,
                state: "open",
            }),
        ).rejects.toMatchObject({
            code: "GITHUB_PULL_REQUEST_REJECTED",
            message: "Validation Failed",
        });
    });

    it("rethrows an update failure that carries no GitHub message", async () => {
        const failure = new ApiError("GITHUB_API_ERROR", "x", 502, 500);
        const { service } = makeService({
            updatePullRequest: vi.fn().mockRejectedValue(failure),
        });

        await expect(
            service.updatePullRequest(connection, {
                repositoryId: 1,
                number: 5,
                state: "open",
            }),
        ).rejects.toBe(failure);
    });

    it("lists commits on a branch", async () => {
        const { service, client } = makeService({
            listCommits: vi.fn().mockResolvedValue([
                {
                    sha: "s",
                    html_url: "u",
                    commit: { message: "m", author: { name: "Ada", date: "d" } },
                    author: user,
                },
            ]),
        });

        const commits = await service.listCommits(connection, 1, "feat", 2, 10);

        expect(client.listCommits).toHaveBeenCalledWith("tok", "o", "r", "feat", 2, 10);
        expect(commits[0]).toMatchObject({ sha: "s", authorName: "Ada" });
    });

    it("lists branches with the default branch first", async () => {
        const { service } = makeService({
            listBranches: vi.fn().mockResolvedValue([
                { name: "feat", protected: false, commit: { sha: "1" } },
                { name: "main", protected: true, commit: { sha: "2" } },
            ]),
        });

        const page = await service.listBranches(connection, 1, 1, 10);

        expect(page.branches.map((b) => b.name)).toEqual(["main", "feat"]);
        expect(page.branches[0]?.isDefault).toBe(true);
        expect(page).toMatchObject({ total: 2, page: 1, perPage: 10 });
    });

    it("reads every page of branches, so none is lost past the first hundred, and cuts the requested one", async () => {
        const full = Array.from({ length: 100 }, (_, i) => ({
            name: `a-${i}`,
            protected: false,
            commit: { sha: `${i}` },
        }));
        const rest = [{ name: "main", protected: true, commit: { sha: "m" } }];
        const listBranches = vi.fn(
            async (_t: string, _o: string, _r: string, page: number) =>
                page === 1 ? full : rest,
        );
        const { service } = makeService({ listBranches });

        const first = await service.listBranches(connection, 1, 1, 6);
        const last = await service.listBranches(connection, 1, 17, 6);

        // Two GitHub pages, read once and cut for both requested pages.
        expect(listBranches).toHaveBeenCalledTimes(2);
        expect(first.total).toBe(101);
        // The default branch (on the second GitHub page) still comes first.
        expect(first.branches[0]?.name).toBe("main");
        expect(first.branches).toHaveLength(6);
        expect(last.branches).toHaveLength(5);
    });

    it("reuses the branch list across pages for a moment", async () => {
        const listBranches = vi.fn().mockResolvedValue([
            { name: "main", protected: true, commit: { sha: "m" } },
        ]);
        const { service, client } = makeService({ listBranches });

        await service.listBranches(connection, 1, 1, 6);
        await service.listBranches(connection, 1, 2, 6);

        expect(listBranches).toHaveBeenCalledTimes(1);
        expect(client.getRepository).toHaveBeenCalledTimes(1);

        clearBranchListCache();
        await service.listBranches(connection, 1, 1, 6);
        expect(listBranches).toHaveBeenCalledTimes(2);
    });

    it("stops reading branches after a safety cap of pages", async () => {
        const full = Array.from({ length: 100 }, (_, i) => ({
            name: `b-${i}`,
            protected: false,
            commit: { sha: `${i}` },
        }));
        const listBranches = vi.fn().mockResolvedValue(full);
        const { service } = makeService({ listBranches });

        const page = await service.listBranches(connection, 1, 1, 10);

        expect(listBranches).toHaveBeenCalledTimes(10);
        expect(page.total).toBe(1000);
    });

    it("lists issues without the pull requests GitHub mixes in, and pages by GitHub's own page", async () => {
        const issue = (number: number, extra: object = {}) => ({
            id: number * 10,
            number,
            title: `Issue ${number}`,
            state: "open",
            html_url: `https://github.com/o/r/issues/${number}`,
            body: null,
            user,
            labels: [{ name: "bug", color: "ff0000" }, "plain"],
            assignees: [user],
            comments: 2,
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-02T00:00:00Z",
            closed_at: null,
            ...extra,
        });
        const { service, client } = makeService({
            listIssues: vi.fn().mockResolvedValue([
                issue(1),
                issue(2, { pull_request: {} }),
            ]),
        });

        const page = await service.listIssues(connection, 1, "open", 1, 2, "2026-01-01T00:00:00.000Z");

        expect(page.issues.map((i) => i.number)).toEqual([1]);
        expect(page.issues[0]).toMatchObject({
            title: "Issue 1",
            commentCount: 2,
            author: { login: "ada" },
            labels: [{ name: "bug", color: "ff0000" }, { name: "plain", color: "757575" }],
            assignees: [{ login: "ada" }],
        });
        // Two came back for a page of two: there may be more, though one was a pull request.
        expect(page.hasMore).toBe(true);
        expect(client.listIssues).toHaveBeenCalledWith("tok", "o", "r", "open", 1, 2, "2026-01-01T00:00:00.000Z");
    });

    it("reports checks for a ref", async () => {
        const { service } = makeService();

        expect((await service.getChecks(connection, 1, "abc")).state).toBe("none");
    });

    it("builds insights and degrades the statistics that fail", async () => {
        const { service } = makeService({
            listContributors: vi.fn().mockRejectedValue(new Error("403")),
            getLanguages: vi.fn().mockResolvedValue({ PHP: 10, TypeScript: 30 }),
            getCommitActivity: vi.fn().mockResolvedValue([
                { week: 1767225600, total: 4, days: [] },
            ]),
        });

        const insights = await service.getInsights(connection, 1);

        expect(insights.repository).toMatchObject({
            fullName: "o/r",
            stars: 3,
            defaultBranch: "main",
        });
        expect(insights.contributors).toEqual([]);
        expect(insights.languages.map((l) => l.name)).toEqual(["TypeScript", "PHP"]);
        expect(insights.commitActivity).toEqual([
            { weekStart: "2026-01-01", total: 4 },
        ]);
    });

    it("treats a non-array statistic (GitHub's 202 placeholder) as empty", async () => {
        const { service } = makeService({
            listContributors: vi.fn().mockResolvedValue({}),
            getCommitActivity: vi.fn().mockResolvedValue({}),
        });

        const insights = await service.getInsights(connection, 1);

        expect(insights.contributors).toEqual([]);
        expect(insights.commitActivity).toEqual([]);
    });
});
