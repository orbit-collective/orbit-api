import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    BranchService,
} from "@/github/actions/branch.service";

import {
    ApiError,
} from "@/shared/errors";

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

function makeService(overrides: {
    repositories?: unknown[];
    createResult?: unknown;
    createError?: unknown;
    getDefaultBranch?: ReturnType<typeof vi.fn>;
    getBranchSha?: ReturnType<typeof vi.fn>;
} = {}) {
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

    const branchClient = {
        getDefaultBranch:
            overrides.getDefaultBranch ??
            vi.fn().mockResolvedValue("main"),

        getBranchSha:
            overrides.getBranchSha ??
            vi.fn().mockResolvedValue("abc123"),

        create: overrides.createError
            ? vi.fn().mockRejectedValue(overrides.createError)
            : vi.fn().mockResolvedValue(
                  overrides.createResult ?? {
                      ref: "refs/heads/1234-fix-login",
                      object: { sha: "abc123" },
                  },
              ),
    };

    return {
        service: new BranchService(
            repositoryService as never,
            installationTokenService as never,
            branchClient as never,
        ),
        repositoryService,
        installationTokenService,
        branchClient,
    };
}

describe("BranchService", () => {
    it("creates a branch from the repository's default branch when no base is given", async () => {
        const { service, branchClient } = makeService();

        const result = await service.create(connection(), {
            repositoryId: 456,
            name: "1234-fix-login",
        });

        expect(branchClient.getDefaultBranch).toHaveBeenCalledWith(
            "installation-token",
            "orbit-collective",
            "orbit",
        );
        expect(branchClient.getBranchSha).toHaveBeenCalledWith(
            "installation-token",
            "orbit-collective",
            "orbit",
            "main",
        );
        expect(branchClient.create).toHaveBeenCalledWith(
            "installation-token",
            "orbit-collective",
            "orbit",
            "1234-fix-login",
            "abc123",
        );
        expect(result).toEqual({
            name: "1234-fix-login",
            url: "https://github.com/orbit-collective/orbit/tree/1234-fix-login",
        });
    });

    it("resolves the SHA from a given base branch instead of the default", async () => {
        const { service, branchClient } = makeService();

        await service.create(connection(), {
            repositoryId: 456,
            name: "1234-fix-login",
            baseBranch: "develop",
        });

        expect(branchClient.getDefaultBranch).not.toHaveBeenCalled();
        expect(branchClient.getBranchSha).toHaveBeenCalledWith(
            "installation-token",
            "orbit-collective",
            "orbit",
            "develop",
        );
    });

    it("rejects a repository that is not connected to this project", async () => {
        const { service, branchClient } = makeService({ repositories: [] });

        await expect(
            service.create(connection(), {
                repositoryId: 999,
                name: "1234-fix-login",
            }),
        ).rejects.toThrow("This repository is not connected to this project.");

        expect(branchClient.create).not.toHaveBeenCalled();
    });

    it("maps a 422 from GitHub into a GITHUB_BRANCH_ALREADY_EXISTS domain error", async () => {
        const { service } = makeService({
            createError: new ApiError(
                "GITHUB_API_ERROR",
                "GitHub API request failed.",
                502,
                422,
            ),
        });

        await expect(
            service.create(connection(), {
                repositoryId: 456,
                name: "1234-fix-login",
            }),
        ).rejects.toMatchObject({ code: "GITHUB_BRANCH_ALREADY_EXISTS" });
    });

    it("maps an unrelated GitHub failure with a message into GITHUB_BRANCH_REJECTED", async () => {
        const { service } = makeService({
            createError: new ApiError(
                "GITHUB_API_ERROR",
                "GitHub API request failed.",
                502,
                403,
                "Resource not accessible by integration",
            ),
        });

        await expect(
            service.create(connection(), {
                repositoryId: 456,
                name: "1234-fix-login",
            }),
        ).rejects.toMatchObject({
            code: "GITHUB_BRANCH_REJECTED",
            message: "Resource not accessible by integration",
        });
    });

    it("does not swallow an unrelated GitHub failure with no message", async () => {
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
                name: "1234-fix-login",
            }),
        ).rejects.toMatchObject({ code: "GITHUB_API_ERROR" });
    });

    it("rejects when the connection is not connected", async () => {
        const { service } = makeService();

        await expect(
            service.create(connection({ status: "pending", installationId: null }), {
                repositoryId: 456,
                name: "1234-fix-login",
            }),
        ).rejects.toThrow("GitHub connection is not connected.");
    });
});
