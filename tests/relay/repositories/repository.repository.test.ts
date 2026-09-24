import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    createFakeStore,
    type FakeBlobStore,
} from "../../helpers/fake-store";

import type {
    GitHubConnectionRepository,
} from "@/relay/repositories/repository.model";

const state =
    vi.hoisted(
        () => ({
            store:
                null as
                    | FakeBlobStore
                    | null,
        }),
    );

vi.mock(
    "@/shared/storage",
    () => ({
        getOrbitStore:
            () =>
                state.store,
    }),
);

const {
    RepositoryRepository,
} = await import(
    "@/relay/repositories/repository.repository"
    );

function createRepository(
    overrides: Partial<GitHubConnectionRepository> = {},
): GitHubConnectionRepository {
    return {
        connectionId: "connection-1",
        installationId: 123,
        repositoryId: 456,
        owner: "orbit-collective",
        name: "orbit",
        addedAt: "2026-09-24T00:00:00.000Z",
        ...overrides,
    };
}

let repository: InstanceType<typeof RepositoryRepository>;

beforeEach(() => {
    state.store = createFakeStore();
    repository = new RepositoryRepository();
});

describe("RepositoryRepository", () => {
    it("stores a repository and finds it back for its connection", async () => {
        await repository.create(createRepository());

        expect(
            await repository.findForConnection("connection-1", 456),
        ).toEqual(createRepository());
    });

    it("returns null for a repository the connection does not have", async () => {
        expect(
            await repository.findForConnection("connection-1", 999),
        ).toBeNull();
    });

    it("lists every repository for a connection", async () => {
        await repository.create(createRepository({ repositoryId: 456, name: "orbit" }));
        await repository.create(createRepository({ repositoryId: 789, name: "orbit-api" }));

        const repositories = await repository.listForConnection("connection-1");

        expect(repositories.map((r) => r.name).sort()).toEqual(["orbit", "orbit-api"]);
    });

    it("writes a webhook-resolution reverse index per repository", async () => {
        await repository.create(createRepository({ repositoryId: 456 }));
        await repository.create(createRepository({ repositoryId: 789, name: "orbit-api" }));

        expect(state.store!.entries.has("connection-repository/123/456")).toBe(true);
        expect(state.store!.entries.has("connection-repository/123/789")).toBe(true);
    });

    it("removes both the repository record and the reverse index on delete", async () => {
        const record = createRepository();
        await repository.create(record);

        await repository.delete(record);

        expect(await repository.findForConnection("connection-1", 456)).toBeNull();
        expect(state.store!.entries.has("connection-repository/123/456")).toBe(false);
    });
});
