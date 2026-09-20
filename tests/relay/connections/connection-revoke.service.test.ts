import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    ConnectionRevokeService,
} from "@/relay/connections/connection-revoke.service";

import type {
    GitHubConnection,
} from "@/relay/connections/connection.model";

function createConnection():
    GitHubConnection {
    return {
        id:
            "connection-1",

        status:
            "connected",

        tokenHash:
            "hash",

        stateHash:
            "state",

        stateExpiresAt:
            "2099-01-01T00:00:00.000Z",

        installationId:
            123,

        repositoryId:
            456,

        repositoryOwner:
            "orbit-collective",

        repositoryName:
            "orbit",

        createdAt:
            "2026-09-19T00:00:00.000Z",

        connectedAt:
            "2026-09-19T00:01:00.000Z",

        revokedAt:
            null,
    };
}

describe(
    "ConnectionRevokeService",
    () => {
        it(
            "revokes active connection",
            async () => {
                const connection =
                    createConnection();

                const repository = {
                    save:
                        vi.fn()
                            .mockResolvedValue(
                                undefined,
                            ),
                };

                const service =
                    new ConnectionRevokeService(
                        repository as never,
                    );

                await service.revoke(
                    connection,
                );

                expect(
                    connection.status,
                ).toBe(
                    "revoked",
                );

                expect(
                    connection.revokedAt,
                ).not.toBeNull();

                expect(
                    repository.save,
                ).toHaveBeenCalledWith(
                    connection,
                );
            },
        );

        it(
            "treats repeated revoke as success",
            async () => {
                const connection =
                    createConnection();

                connection.status =
                    "revoked";

                connection.revokedAt =
                    "2026-09-19T01:00:00.000Z";

                const repository = {
                    save:
                        vi.fn(),
                };

                const service =
                    new ConnectionRevokeService(
                        repository as never,
                    );

                await service.revoke(
                    connection,
                );

                expect(
                    repository.save,
                ).not.toHaveBeenCalled();
            },
        );
    },
);