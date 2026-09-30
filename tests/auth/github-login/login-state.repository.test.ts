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

const state = vi.hoisted(() => ({
    store: null as FakeBlobStore | null,
}));

vi.mock("@/shared/storage", () => ({
    getOrbitStore: () => state.store,
}));

const {
    LoginStateRepository,
} = await import(
    "@/auth/github-login/login-state.repository"
);

let repository: InstanceType<typeof LoginStateRepository>;

beforeEach(() => {
    state.store = createFakeStore();
    repository = new LoginStateRepository();
});

describe("LoginStateRepository", () => {
    it("creates and finds a login state by its state hash", async () => {
        await repository.create("hash-1", {
            returnTo: "https://orbit.test/auth/github/callback",
            createdAt: "2026-09-30T00:00:00.000Z",
            expiresAt: "2026-09-30T00:15:00.000Z",
        });

        const found = await repository.findByStateHash("hash-1");

        expect(found?.returnTo).toBe(
            "https://orbit.test/auth/github/callback",
        );
    });

    it("returns null for an unknown state hash", async () => {
        const found = await repository.findByStateHash("missing");

        expect(found).toBeNull();
    });

    it("rejects creating the same state hash twice", async () => {
        await repository.create("hash-1", {
            returnTo: "https://orbit.test",
            createdAt: "2026-09-30T00:00:00.000Z",
            expiresAt: "2026-09-30T00:15:00.000Z",
        });

        await expect(
            repository.create("hash-1", {
                returnTo: "https://other.test",
                createdAt: "2026-09-30T00:00:00.000Z",
                expiresAt: "2026-09-30T00:15:00.000Z",
            }),
        ).rejects.toThrow();
    });

    it("removes a login state", async () => {
        await repository.create("hash-1", {
            returnTo: "https://orbit.test",
            createdAt: "2026-09-30T00:00:00.000Z",
            expiresAt: "2026-09-30T00:15:00.000Z",
        });

        await repository.remove("hash-1");

        expect(await repository.findByStateHash("hash-1")).toBeNull();
    });
});
