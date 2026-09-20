import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    GitHubCallbackService,
} from "@/github/installations/github-callback.service";

import type {
    GitHubConnection,
} from "@/relay/connections/connection.model";

import type {
    GitHubRepository,
} from "@/github/installations/github-oauth.types";

function createPendingConnection():
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

function createRepository(
    id = 456,
): GitHubRepository {
    return {
        id,

        name: "orbit",

        full_name:
            "orbit-collective/orbit",

        owner: {
            login:
                "orbit-collective",
        },

        private: true,
    };
}

let connection: GitHubConnection;

let stateService: {
    resolve: ReturnType<
        typeof vi.fn
    >;
};

let oauthService: {
    exchangeCode: ReturnType<
        typeof vi.fn
    >;
};

let installationService: {
    findInstallationForUser:
        ReturnType<typeof vi.fn>;

    listRepositories:
        ReturnType<typeof vi.fn>;
};

let connectionRepository: {
    save: ReturnType<typeof vi.fn>;

    removeStateLookup:
        ReturnType<typeof vi.fn>;
};

function createService() {
    return new GitHubCallbackService(
        stateService as never,
        oauthService as never,
        installationService as never,
        connectionRepository as never,
    );
}

beforeEach(
    () => {
        connection =
            createPendingConnection();

        stateService = {
            resolve:
                vi.fn()
                    .mockResolvedValue(
                        connection,
                    ),
        };

        oauthService = {
            exchangeCode:
                vi.fn()
                    .mockResolvedValue(
                        "gho_token",
                    ),
        };

        installationService = {
            findInstallationForUser:
                vi.fn()
                    .mockResolvedValue({
                        id: 123,
                    }),

            listRepositories:
                vi.fn()
                    .mockResolvedValue([
                        createRepository(),
                    ]),
        };

        connectionRepository = {
            save:
                vi.fn()
                    .mockResolvedValue(
                        undefined,
                    ),

            removeStateLookup:
                vi.fn()
                    .mockResolvedValue(
                        undefined,
                    ),
        };
    },
);

describe(
    "GitHubCallbackService",
    () => {
        it(
            "links the connection to the selected repository",
            async () => {
                const dto =
                    await createService()
                        .handle(
                            "code",
                            "state",
                            123,
                        );

                expect(
                    dto.status,
                ).toBe("connected");

                expect(
                    connection,
                ).toMatchObject({
                    status:
                        "connected",

                    installationId: 123,

                    repositoryId: 456,

                    repositoryOwner:
                        "orbit-collective",

                    repositoryName:
                        "orbit",
                });

                expect(
                    connection
                        .connectedAt,
                ).not.toBeNull();

                expect(
                    oauthService
                        .exchangeCode,
                ).toHaveBeenCalledWith(
                    "code",
                );

                expect(
                    installationService
                        .findInstallationForUser,
                ).toHaveBeenCalledWith(
                    "gho_token",
                    123,
                );

                expect(
                    connectionRepository
                        .save,
                ).toHaveBeenCalledWith(
                    connection,
                );

                expect(
                    connectionRepository
                        .removeStateLookup,
                ).toHaveBeenCalledWith(
                    "state-hash",
                );
            },
        );

        it(
            "rejects an installation without repositories",
            async () => {
                installationService
                    .listRepositories
                    .mockResolvedValue(
                        [],
                    );

                await expect(
                    createService()
                        .handle(
                            "code",
                            "state",
                            123,
                        ),
                ).rejects.toMatchObject({
                    code:
                        "NO_REPOSITORY_SELECTED",

                    status: 400,
                });

                expect(
                    connectionRepository
                        .save,
                ).not
                    .toHaveBeenCalled();
            },
        );

        it(
            "rejects an installation with several repositories",
            async () => {
                installationService
                    .listRepositories
                    .mockResolvedValue([
                        createRepository(
                            1,
                        ),
                        createRepository(
                            2,
                        ),
                    ]);

                await expect(
                    createService()
                        .handle(
                            "code",
                            "state",
                            123,
                        ),
                ).rejects.toMatchObject({
                    code:
                        "MULTIPLE_REPOSITORIES_SELECTED",

                    status: 400,
                });
            },
        );

        it(
            "rejects a repository that cannot be resolved",
            async () => {
                installationService
                    .listRepositories
                    .mockResolvedValue([
                        undefined,
                    ]);

                await expect(
                    createService()
                        .handle(
                            "code",
                            "state",
                            123,
                        ),
                ).rejects.toMatchObject({
                    code:
                        "REPOSITORY_NOT_FOUND",

                    status: 400,
                });
            },
        );

        it(
            "propagates an invalid state",
            async () => {
                stateService.resolve
                    .mockRejectedValue(
                        new Error(
                            "Connection state is invalid.",
                        ),
                    );

                await expect(
                    createService()
                        .handle(
                            "code",
                            "state",
                            123,
                        ),
                ).rejects.toThrow(
                    "Connection state is invalid.",
                );

                expect(
                    oauthService
                        .exchangeCode,
                ).not
                    .toHaveBeenCalled();
            },
        );
    },
);
