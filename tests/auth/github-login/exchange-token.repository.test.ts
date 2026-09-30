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
    ExchangeTokenRepository,
} = await import(
    "@/auth/github-login/exchange-token.repository"
);

let repository: InstanceType<typeof ExchangeTokenRepository>;

function createToken() {
    return {
        githubId: "123",
        githubUsername: "octocat",
        email: "octocat@example.com",
        name: "The Octocat",
        createdAt: "2026-09-30T00:00:00.000Z",
        expiresAt: "2026-09-30T00:01:00.000Z",
    };
}

beforeEach(() => {
    state.store = createFakeStore();
    repository = new ExchangeTokenRepository();
});

describe("ExchangeTokenRepository", () => {
    it("creates and consumes a token exactly once", async () => {
        await repository.create("hash-1", createToken());

        const consumed = await repository.consume("hash-1");

        expect(consumed?.githubUsername).toBe("octocat");

        const consumedAgain = await repository.consume("hash-1");

        expect(consumedAgain).toBeNull();
    });

    it("returns null when consuming an unknown token", async () => {
        expect(await repository.consume("missing")).toBeNull();
    });

    it("rejects creating the same token hash twice", async () => {
        await repository.create("hash-1", createToken());

        await expect(
            repository.create("hash-1", createToken()),
        ).rejects.toThrow();
    });
});
