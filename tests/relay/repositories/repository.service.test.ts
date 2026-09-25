import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

const listRepositoriesMock = vi.hoisted(() => vi.fn());

vi.mock(
    "@/github/installations/github-installation.service",
    () => ({
        GitHubInstallationService: vi.fn().mockImplementation(function (this: {
            listRepositories: typeof listRepositoriesMock;
        }) {
            this.listRepositories = listRepositoriesMock;
        }),
    }),
);

import {
    createFakeStore,
    type FakeBlobStore,
} from "../../helpers/fake-store";

import type {
    GitHubConnection,
} from "@/relay/connections/connection.model";

const state = vi.hoisted(() => ({
    store: null as FakeBlobStore | null,
}));

vi.mock("@/shared/storage", () => ({
    getOrbitStore: () => state.store,
}));

const { RepositoryService } = await import(
    "@/relay/repositories/repository.service"
);

function createConnection(
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

let service: InstanceType<typeof RepositoryService>;

beforeEach(() => {
    state.store = createFakeStore();
    listRepositoriesMock.mockReset();
    service = new RepositoryService();
});

describe("RepositoryService", () => {
    it("synthesizes the legacy repository when nothing has been migrated yet", async () => {
        const repositories = await service.listForConnection(createConnection());

        expect(repositories).toEqual([
            {
                connectionId: "connection-1",
                installationId: 123,
                repositoryId: 456,
                owner: "orbit-collective",
                name: "orbit",
                addedAt: "2026-09-19T00:01:00.000Z",
            },
        ]);
    });

    it("returns an empty list for a connection with no repository at all", async () => {
        const repositories = await service.listForConnection(
            createConnection({ repositoryId: null, repositoryOwner: null, repositoryName: null }),
        );

        expect(repositories).toEqual([]);
    });

    it("adds a repository the installation actually grants access to", async () => {
        listRepositoriesMock.mockResolvedValue([
            { id: 789, name: "orbit-api", full_name: "orbit-collective/orbit-api", owner: { login: "orbit-collective" } },
        ]);

        const record = await service.add(createConnection(), 789);

        expect(record.owner).toBe("orbit-collective");
        expect(record.name).toBe("orbit-api");

        const repositories = await service.listForConnection(createConnection());
        expect(repositories.map((r) => r.repositoryId).sort()).toEqual([456, 789]);
    });

    it("rejects adding a repository the installation does not grant access to", async () => {
        listRepositoriesMock.mockResolvedValue([]);

        await expect(service.add(createConnection(), 999)).rejects.toThrow(
            "This repository is not accessible to the connected GitHub App installation.",
        );
    });

    it("removes a repository added after migration", async () => {
        listRepositoriesMock.mockResolvedValue([
            { id: 789, name: "orbit-api", full_name: "orbit-collective/orbit-api", owner: { login: "orbit-collective" } },
        ]);
        const connection = createConnection();
        await service.add(connection, 789);

        await service.remove(connection, 789);

        const repositories = await service.listForConnection(connection);
        expect(repositories.map((r) => r.repositoryId)).toEqual([456]);
    });

    it("removes the legacy repository even though it was never explicitly added", async () => {
        const connection = createConnection();

        await service.remove(connection, 456);

        const repositories = await service.listForConnection(connection);
        expect(repositories).toEqual([]);
    });

    it("rejects removing a repository that is not connected", async () => {
        await expect(service.remove(createConnection(), 999)).rejects.toThrow(
            "This repository is not connected to this project.",
        );
    });

    it("lists installation repositories not yet connected as available", async () => {
        listRepositoriesMock.mockResolvedValue([
            { id: 456, name: "orbit", full_name: "orbit-collective/orbit", owner: { login: "orbit-collective" } },
            { id: 789, name: "orbit-api", full_name: "orbit-collective/orbit-api", owner: { login: "orbit-collective" } },
        ]);

        const available = await service.listAvailableForConnection(createConnection());

        expect(available).toEqual([
            { id: 789, owner: "orbit-collective", name: "orbit-api" },
        ]);
    });

    it("returns no available repositories for a connection with no installation", async () => {
        const available = await service.listAvailableForConnection(
            createConnection({ installationId: null }),
        );

        expect(available).toEqual([]);
        expect(listRepositoriesMock).not.toHaveBeenCalled();
    });
});
