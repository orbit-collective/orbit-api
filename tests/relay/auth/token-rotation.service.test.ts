import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    TokenRotationService,
} from "@/relay/auth/token-rotation.service";

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
            "old-hash",

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
    "TokenRotationService",
    () => {
        it(
            "replaces relay token hash",
            async () => {
                const connection =
                    createConnection();

                const repository = {
                    replaceTokenLookup:
                        vi.fn()
                            .mockResolvedValue(
                                undefined,
                            ),
                };

                const service =
                    new TokenRotationService(
                        repository as never,
                    );

                const token =
                    await service.rotate(
                        connection,
                    );

                expect(
                    token.startsWith(
                        "orb_local_",
                    ),
                ).toBe(true);

                expect(
                    connection.tokenHash,
                ).not.toBe(
                    "old-hash",
                );

                expect(
                    repository
                        .replaceTokenLookup,
                ).toHaveBeenCalledWith(
                    connection,
                    "old-hash",
                );
            },
        );
    },
);