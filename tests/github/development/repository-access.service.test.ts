import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    RepositoryAccessService,
} from "@/github/development/repository-access.service";

import type {
    GitHubConnection,
} from "@/relay/connections/connection.model";

function connection(overrides: Partial<GitHubConnection> = {}): GitHubConnection {
    return {
        id: "c",
        status: "connected",
        installationId: 123,
        ...overrides,
    } as GitHubConnection;
}

function make() {
    const repositories = {
        listForConnection: vi.fn().mockResolvedValue([
            { repositoryId: 1, owner: "o", name: "r" },
        ]),
    };
    const tokens = { create: vi.fn().mockResolvedValue({ token: "tok" }) };

    return {
        service: new RepositoryAccessService(repositories as never, tokens as never),
        tokens,
    };
}

describe("RepositoryAccessService", () => {
    it("returns the repository and a fresh installation token", async () => {
        const { service, tokens } = make();

        await expect(service.authorize(connection(), 1)).resolves.toEqual({
            repository: { repositoryId: 1, owner: "o", name: "r" },
            token: "tok",
        });
        expect(tokens.create).toHaveBeenCalledWith(123);
    });

    it("rejects a connection that is not connected, without minting a token", async () => {
        const { service, tokens } = make();

        for (const overrides of [{ status: "pending" as const }, { installationId: null }]) {
            await expect(
                service.authorize(connection(overrides), 1),
            ).rejects.toMatchObject({ code: "CONNECTION_NOT_CONNECTED" });
        }
        expect(tokens.create).not.toHaveBeenCalled();
    });

    it("rejects a repository of another connection", async () => {
        const { service, tokens } = make();

        await expect(service.authorize(connection(), 2)).rejects.toMatchObject({
            code: "GITHUB_REPOSITORY_NOT_ALLOWED",
            status: 403,
        });
        expect(tokens.create).not.toHaveBeenCalled();
    });
});
