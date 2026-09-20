import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    ConnectionStateService,
} from "@/relay/connections/connection-state.service";

import {
    sha256,
} from "@/security/hash";

import type {
    GitHubConnection,
} from "@/relay/connections/connection.model";

function createPendingConnection():
    GitHubConnection {
    return {
        id:
            "connection-1",

        status:
            "pending",

        tokenHash:
            "token",

        stateHash:
            sha256(
                "valid-state",
            ),

        stateExpiresAt:
            "2099-01-01T00:00:00.000Z",

        installationId:
            null,

        repositoryId:
            null,

        repositoryOwner:
            null,

        repositoryName:
            null,

        createdAt:
            "2026-09-19T00:00:00.000Z",

        connectedAt:
            null,

        revokedAt:
            null,
    };
}

describe(
    "ConnectionStateService",
    () => {
        it(
            "resolves valid installation state",
            async () => {
                const repository = {
                    findByStateHash:
                        vi.fn()
                            .mockResolvedValue(
                                createPendingConnection(),
                            ),
                };

                const service =
                    new ConnectionStateService(
                        repository as never,
                    );

                const result =
                    await service.resolve(
                        "valid-state",
                    );

                expect(
                    result.id,
                ).toBe(
                    "connection-1",
                );
            },
        );

        it(
            "rejects unknown state",
            async () => {
                const repository = {
                    findByStateHash:
                        vi.fn()
                            .mockResolvedValue(
                                null,
                            ),
                };

                const service =
                    new ConnectionStateService(
                        repository as never,
                    );

                await expect(
                    service.resolve(
                        "invalid-state",
                    ),
                ).rejects.toThrow(
                    "Connection state is invalid.",
                );
            },
        );

        it(
            "rejects expired state",
            async () => {
                const connection =
                    createPendingConnection();

                connection.stateExpiresAt =
                    "2020-01-01T00:00:00.000Z";

                const repository = {
                    findByStateHash:
                        vi.fn()
                            .mockResolvedValue(
                                connection,
                            ),
                };

                const service =
                    new ConnectionStateService(
                        repository as never,
                    );

                await expect(
                    service.resolve(
                        "valid-state",
                    ),
                ).rejects.toThrow(
                    "Connection state has expired.",
                );
            },
        );

        it(
            "rejects state belonging to completed connection",
            async () => {
                const connection =
                    createPendingConnection();

                connection.status =
                    "connected";

                const repository = {
                    findByStateHash:
                        vi.fn()
                            .mockResolvedValue(
                                connection,
                            ),
                };

                const service =
                    new ConnectionStateService(
                        repository as never,
                    );

                await expect(
                    service.resolve(
                        "valid-state",
                    ),
                ).rejects.toThrow(
                    "Connection is no longer pending.",
                );
            },
        );
    },
);