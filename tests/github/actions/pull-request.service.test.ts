import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    ApiError,
} from "@/shared/errors";

import {
    PullRequestService,
} from "@/github/actions/pull-request.service";

import type {
    GitHubConnection,
} from "@/relay/connections/connection.model";

function connection(
    overrides: Partial<GitHubConnection> = {},
): GitHubConnection {
    return {
        id: "connection-1",
        status: "connected",
        tokenHash: "hash",
        stateHash: "state",
        stateExpiresAt: "2099-01-01T00:00:00.000Z",
        installationId: 123,
        repositoryId: 456,
        repositoryOwner: "orbit-collective",
        repositoryName: "orbit",
        createdAt: "2026-09-19T00:00:00.000Z",
        connectedAt: "2026-09-19T00:01:00.000Z",
        revokedAt: null,
        ...overrides,
    };
}

function makeService(
    overrides: { repositories?: unknown[]; createError?: unknown } = {},
) {
    const repositoryService = {
        listForConnection: vi.fn().mockResolvedValue(
            overrides.repositories ?? [
                { repositoryId: 456, owner: "orbit-collective", name: "orbit" },
            ],
        ),
    };

    const installationTokenService = {
        create: vi.fn().mockResolvedValue({ token: "installation-token" }),
    };

    const pullRequestClient = {
        create: overrides.createError
            ? vi.fn().mockRejectedValue(overrides.createError)
            : vi.fn().mockResolvedValue({
                  number: 51,
                  html_url: "https://github.com/orbit-collective/orbit/pull/51",
                  title: "Fix login redirect",
              }),
    };

    return {
        service: new PullRequestService(
            repositoryService as never,
            installationTokenService as never,
            pullRequestClient as never,
        ),
        repositoryService,
        pullRequestClient,
    };
}

describe("PullRequestService", () => {
    it("creates a pull request with the given title/head/base/body", async () => {
        const { service, pullRequestClient } = makeService();

        const result = await service.create(connection(), {
            repositoryId: 456,
            title: "Fix login redirect",
            head: "fix/login-redirect",
            base: "main",
            body: "<!-- orbit-issue:213769 -->",
        });

        expect(pullRequestClient.create).toHaveBeenCalledWith(
            "installation-token",
            "orbit-collective",
            "orbit",
            "Fix login redirect",
            "fix/login-redirect",
            "main",
            "<!-- orbit-issue:213769 -->",
        );

        expect(result).toEqual({
            number: 51,
            url: "https://github.com/orbit-collective/orbit/pull/51",
            title: "Fix login redirect",
        });
    });

    it("rejects a repository that is not connected to this project", async () => {
        const { service, pullRequestClient } = makeService({ repositories: [] });

        await expect(
            service.create(connection(), {
                repositoryId: 999,
                title: "x",
                head: "a",
                base: "b",
                body: "",
            }),
        ).rejects.toThrow("This repository is not connected to this project.");

        expect(pullRequestClient.create).not.toHaveBeenCalled();
    });

    it("maps a GitHub rejection with a message into GITHUB_PULL_REQUEST_REJECTED", async () => {
        const { service } = makeService({
            createError: new ApiError(
                "GITHUB_API_ERROR",
                "GitHub API request failed.",
                502,
                422,
                "A pull request already exists for orbit-collective:fix/login-redirect.",
            ),
        });

        await expect(
            service.create(connection(), {
                repositoryId: 456,
                title: "Fix login",
                head: "fix/login-redirect",
                base: "main",
                body: "",
            }),
        ).rejects.toMatchObject({
            code: "GITHUB_PULL_REQUEST_REJECTED",
            message:
                "A pull request already exists for orbit-collective:fix/login-redirect.",
        });
    });

    it("does not swallow a GitHub rejection with no message", async () => {
        const { service } = makeService({
            createError: new ApiError(
                "GITHUB_API_ERROR",
                "GitHub API request failed.",
                502,
                500,
            ),
        });

        await expect(
            service.create(connection(), {
                repositoryId: 456,
                title: "x",
                head: "a",
                base: "b",
                body: "",
            }),
        ).rejects.toMatchObject({ code: "GITHUB_API_ERROR" });
    });

    it("rejects when the connection is not connected", async () => {
        const { service } = makeService();

        await expect(
            service.create(connection({ status: "pending", installationId: null }), {
                repositoryId: 456,
                title: "x",
                head: "a",
                base: "b",
                body: "",
            }),
        ).rejects.toThrow("GitHub connection is not connected.");
    });
});
