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
    GitHubConnection,
} from "@/relay/connections/connection.model";

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
    ConnectionRepository,
} = await import(
    "@/relay/connections/connection.repository"
    );

function createConnection():
    GitHubConnection {
    return {
        id: "connection-1",

        status: "pending",

        tokenHash: "token-hash",

        stateHash: "state-hash",

        stateExpiresAt:
            "2099-01-01T00:00:00.000Z",

        installationId: null,

        repositoryId: null,

        repositoryOwner: null,

        repositoryName: null,

        createdAt:
            "2026-09-19T00:00:00.000Z",

        connectedAt: null,

        revokedAt: null,
    };
}

let repository:
    InstanceType<
        typeof ConnectionRepository
    >;

beforeEach(
    () => {
        state.store =
            createFakeStore();

        repository =
            new ConnectionRepository();
    },
);

describe(
    "ConnectionRepository",
    () => {
        it(
            "stores the connection with token and state lookups",
            async () => {
                const connection =
                    createConnection();

                await repository.create(
                    connection,
                );

                expect([
                    ...state.store!
                        .entries
                        .keys(),
                ]).toEqual([
                    "connections/connection-1",
                    "connection-token/token-hash",
                    "connection-state/state-hash",
                ]);
            },
        );

        it(
            "rejects a duplicated connection id",
            async () => {
                const connection =
                    createConnection();

                await repository.create(
                    connection,
                );

                await expect(
                    repository.create(
                        connection,
                    ),
                ).rejects.toThrow(
                    "Connection connection-1 already exists.",
                );
            },
        );

        it(
            "finds a connection by id",
            async () => {
                const connection =
                    createConnection();

                await repository.create(
                    connection,
                );

                expect(
                    await repository
                        .findById(
                            "connection-1",
                        ),
                ).toEqual(connection);

                expect(
                    await repository
                        .findById(
                            "missing",
                        ),
                ).toBeNull();
            },
        );

        it(
            "finds a connection by token hash",
            async () => {
                const connection =
                    createConnection();

                await repository.create(
                    connection,
                );

                expect(
                    await repository
                        .findByTokenHash(
                            "token-hash",
                        ),
                ).toEqual(connection);

                expect(
                    await repository
                        .findByTokenHash(
                            "unknown",
                        ),
                ).toBeNull();
            },
        );

        it(
            "finds a connection by state hash",
            async () => {
                const connection =
                    createConnection();

                await repository.create(
                    connection,
                );

                expect(
                    await repository
                        .findByStateHash(
                            "state-hash",
                        ),
                ).toEqual(connection);

                expect(
                    await repository
                        .findByStateHash(
                            "unknown",
                        ),
                ).toBeNull();
            },
        );

        it(
            "saves the repository lookup once the connection is linked",
            async () => {
                const connection =
                    createConnection();

                await repository.create(
                    connection,
                );

                connection.status =
                    "connected";

                connection.installationId =
                    123;

                connection.repositoryId =
                    456;

                await repository.save(
                    connection,
                );

                expect(
                    await repository
                        .findByRepository(
                            123,
                            456,
                        ),
                ).toEqual(connection);
            },
        );

        it(
            "skips the repository lookup while the connection is unlinked",
            async () => {
                const connection =
                    createConnection();

                await repository.save(
                    connection,
                );

                expect(
                    await repository
                        .findByRepository(
                            123,
                            456,
                        ),
                ).toBeNull();
            },
        );

        it(
            "replaces the token lookup and drops the previous one",
            async () => {
                const connection =
                    createConnection();

                await repository.create(
                    connection,
                );

                connection.tokenHash =
                    "new-token-hash";

                await repository
                    .replaceTokenLookup(
                        connection,
                        "token-hash",
                    );

                expect(
                    await repository
                        .findByTokenHash(
                            "new-token-hash",
                        ),
                ).toEqual(connection);

                expect(
                    await repository
                        .findByTokenHash(
                            "token-hash",
                        ),
                ).toBeNull();
            },
        );

        it(
            "removes the state lookup",
            async () => {
                const connection =
                    createConnection();

                await repository.create(
                    connection,
                );

                await repository
                    .removeStateLookup(
                        "state-hash",
                    );

                expect(
                    await repository
                        .findByStateHash(
                            "state-hash",
                        ),
                ).toBeNull();
            },
        );
    },
);
