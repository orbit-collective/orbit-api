import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    ConnectionAuthenticator,
} from "@/relay/auth/connection-auth";

import type {
    GitHubConnection,
} from "@/relay/connections/connection.model";

function createConnection(
    status: GitHubConnection["status"] = "connected",
): GitHubConnection {
    return {
        id:
            "connection-1",

        status,

        tokenHash:
            "unused-in-test",

        stateHash:
            "state-hash",

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
            status === "revoked"
                ? "2026-09-19T01:00:00.000Z"
                : null,
    };
}

describe(
    "ConnectionAuthenticator",
    () => {
        it(
            "authenticates valid relay token",
            async () => {
                const repository = {
                    findByTokenHash:
                        vi.fn()
                            .mockResolvedValue(
                                createConnection(),
                            ),
                };

                const authenticator =
                    new ConnectionAuthenticator(
                        repository as never,
                    );

                const request =
                    new Request(
                        "https://api.orbit-dev.app/v1/github/events",
                        {
                            headers: {
                                Authorization:
                                    "Bearer orb_local_test",
                            },
                        },
                    );

                const result =
                    await authenticator
                        .authenticate(
                            request,
                        );

                expect(
                    result.id,
                ).toBe(
                    "connection-1",
                );

                expect(
                    repository
                        .findByTokenHash,
                ).toHaveBeenCalledOnce();
            },
        );

        it(
            "rejects token without Orbit prefix",
            async () => {
                const repository = {
                    findByTokenHash:
                        vi.fn(),
                };

                const authenticator =
                    new ConnectionAuthenticator(
                        repository as never,
                    );

                const request =
                    new Request(
                        "https://api.orbit-dev.app",
                        {
                            headers: {
                                Authorization:
                                    "Bearer abc123",
                            },
                        },
                    );

                await expect(
                    authenticator
                        .authenticate(
                            request,
                        ),
                ).rejects.toThrow(
                    "Relay token is invalid.",
                );

                expect(
                    repository
                        .findByTokenHash,
                ).not.toHaveBeenCalled();
            },
        );

        it(
            "rejects unknown relay token",
            async () => {
                const repository = {
                    findByTokenHash:
                        vi.fn()
                            .mockResolvedValue(
                                null,
                            ),
                };

                const authenticator =
                    new ConnectionAuthenticator(
                        repository as never,
                    );

                const request =
                    new Request(
                        "https://api.orbit-dev.app",
                        {
                            headers: {
                                Authorization:
                                    "Bearer orb_local_unknown",
                            },
                        },
                    );

                await expect(
                    authenticator
                        .authenticate(
                            request,
                        ),
                ).rejects.toThrow(
                    "Relay token is invalid.",
                );
            },
        );

        it(
            "rejects revoked connection",
            async () => {
                const repository = {
                    findByTokenHash:
                        vi.fn()
                            .mockResolvedValue(
                                createConnection(
                                    "revoked",
                                ),
                            ),
                };

                const authenticator =
                    new ConnectionAuthenticator(
                        repository as never,
                    );

                const request =
                    new Request(
                        "https://api.orbit-dev.app",
                        {
                            headers: {
                                Authorization:
                                    "Bearer orb_local_revoked",
                            },
                        },
                    );

                await expect(
                    authenticator
                        .authenticate(
                            request,
                        ),
                ).rejects.toThrow(
                    "This connection has been revoked.",
                );
            },
        );
    },
);