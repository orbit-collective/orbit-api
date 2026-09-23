import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    GitHubWebhookService,
} from "@/github/webhooks/github-webhook.service";

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

function createPayload() {
    return {
        action:
            "opened",

        installation: {
            id:
                123,
        },

        repository: {
            id:
                456,

            name:
                "orbit",

            full_name:
                "orbit-collective/orbit",

            owner: {
                login:
                    "orbit-collective",
            },
        },

        pull_request: {
            id:
                999,

            number:
                283,

            title:
                "Fix login redirect",

            body:
                "<!-- orbit-issue:213769 -->",

            html_url:
                "https://github.com/orbit-collective/orbit/pull/283",

            draft:
                false,

            head: {
                ref:
                    "fix/login-redirect",
            },

            base: {
                ref:
                    "master",
            },
        },
    };
}

describe(
    "GitHubWebhookService",
    () => {
        it(
            "creates relay event for opened pull request",
            async () => {
                const deliveryRepository = {
                    findById:
                        vi.fn()
                            .mockResolvedValue(
                                null,
                            ),

                    create:
                        vi.fn()
                            .mockResolvedValue(
                                true,
                            ),

                    save:
                        vi.fn()
                            .mockResolvedValue(
                                undefined,
                            ),
                };

                const connectionRepository = {
                    findByRepository:
                        vi.fn()
                            .mockResolvedValue(
                                createConnection(),
                            ),
                };

                const eventRepository = {
                    findByDeliveryId:
                        vi.fn()
                            .mockResolvedValue(
                                null,
                            ),

                    create:
                        vi.fn()
                            .mockResolvedValue(
                                undefined,
                            ),
                };

                const service =
                    new GitHubWebhookService(
                        deliveryRepository as never,
                        connectionRepository as never,
                        eventRepository as never,
                    );

                const result =
                    await service.handle({
                        deliveryId:
                            "delivery-1",

                        event:
                            "pull_request",

                        payload:
                            createPayload(),
                    });

                expect(
                    result.ignored,
                ).toBe(false);

                expect(
                    result.duplicate,
                ).toBe(false);

                expect(
                    result.relayEventId,
                ).not.toBeNull();

                expect(
                    eventRepository.create,
                ).toHaveBeenCalledOnce();

                const createdEvent =
                    eventRepository
                        .create
                        .mock
                        .calls[0]
                        ?.[0];

                expect(
                    createdEvent
                        .pullRequestNumber,
                ).toBe(283);

                expect(
                    createdEvent
                        .repositoryId,
                ).toBe(456);
            },
        );

        it(
            "ignores pull request actions other than opened",
            async () => {
                const deliveryRepository = {
                    findById:
                        vi.fn()
                            .mockResolvedValue(
                                null,
                            ),

                    create:
                        vi.fn()
                            .mockResolvedValue(
                                true,
                            ),

                    save:
                        vi.fn()
                            .mockResolvedValue(
                                undefined,
                            ),
                };

                const connectionRepository = {
                    findByRepository:
                        vi.fn(),
                };

                const eventRepository = {
                    findByDeliveryId:
                        vi.fn(),

                    create:
                        vi.fn(),
                };

                const payload =
                    createPayload();

                payload.action =
                    "closed";

                const service =
                    new GitHubWebhookService(
                        deliveryRepository as never,
                        connectionRepository as never,
                        eventRepository as never,
                    );

                const result =
                    await service.handle({
                        deliveryId:
                            "delivery-2",

                        event:
                            "pull_request",

                        payload,
                    });

                expect(
                    result.ignored,
                ).toBe(true);

                expect(
                    eventRepository.create,
                ).not.toHaveBeenCalled();
            },
        );

        it(
            "does not process completed delivery twice",
            async () => {
                const deliveryRepository = {
                    findById:
                        vi.fn()
                            .mockResolvedValue({
                                id:
                                    "delivery-1",

                                event:
                                    "pull_request",

                                action:
                                    "opened",

                                status:
                                    "processed",

                                receivedAt:
                                    "2026-09-19T00:00:00.000Z",

                                processingStartedAt:
                                    "2026-09-19T00:00:01.000Z",

                                processedAt:
                                    "2026-09-19T00:00:02.000Z",

                                failedAt:
                                    null,

                                attempts:
                                    1,

                                lastError:
                                    null,
                            }),

                    create:
                        vi.fn(),

                    save:
                        vi.fn(),
                };

                const connectionRepository = {
                    findByRepository:
                        vi.fn(),
                };

                const eventRepository = {
                    findByDeliveryId:
                        vi.fn(),

                    create:
                        vi.fn(),
                };

                const service =
                    new GitHubWebhookService(
                        deliveryRepository as never,
                        connectionRepository as never,
                        eventRepository as never,
                    );

                const result =
                    await service.handle({
                        deliveryId:
                            "delivery-1",

                        event:
                            "pull_request",

                        payload:
                            createPayload(),
                    });

                expect(
                    result.duplicate,
                ).toBe(true);

                expect(
                    connectionRepository
                        .findByRepository,
                ).not.toHaveBeenCalled();

                expect(
                    eventRepository.create,
                ).not.toHaveBeenCalled();
            },
        );

        it(
            "retries previously failed delivery",
            async () => {
                const failedDelivery = {
                    id:
                        "delivery-retry",

                    event:
                        "pull_request",

                    action:
                        "opened",

                    status:
                        "failed",

                    receivedAt:
                        "2026-09-19T00:00:00.000Z",

                    processingStartedAt:
                        "2026-09-19T00:00:01.000Z",

                    processedAt:
                        null,

                    failedAt:
                        "2026-09-19T00:00:02.000Z",

                    attempts:
                        1,

                    lastError:
                        "Previous failure",
                };

                const deliveryRepository = {
                    findById:
                        vi.fn()
                            .mockResolvedValue(
                                failedDelivery,
                            ),

                    create:
                        vi.fn(),

                    save:
                        vi.fn()
                            .mockResolvedValue(
                                undefined,
                            ),
                };

                const connectionRepository = {
                    findByRepository:
                        vi.fn()
                            .mockResolvedValue(
                                createConnection(),
                            ),
                };

                const eventRepository = {
                    findByDeliveryId:
                        vi.fn()
                            .mockResolvedValue(
                                null,
                            ),

                    create:
                        vi.fn()
                            .mockResolvedValue(
                                undefined,
                            ),
                };

                const service =
                    new GitHubWebhookService(
                        deliveryRepository as never,
                        connectionRepository as never,
                        eventRepository as never,
                    );

                await service.handle({
                    deliveryId:
                        "delivery-retry",

                    event:
                        "pull_request",

                    payload:
                        createPayload(),
                });

                expect(
                    failedDelivery.attempts,
                ).toBe(2);

                expect(
                    failedDelivery.status,
                ).toBe(
                    "processed",
                );

                expect(
                    failedDelivery.lastError,
                ).toBeNull();
            },
        );

        it(
            "reuses existing relay event for the same delivery",
            async () => {
                const deliveryRepository = {
                    findById:
                        vi.fn()
                            .mockResolvedValue({
                                id:
                                    "delivery-1",

                                event:
                                    "pull_request",

                                action:
                                    "opened",

                                status:
                                    "failed",

                                receivedAt:
                                    "2026-09-19T00:00:00.000Z",

                                processingStartedAt:
                                    "2026-09-19T00:00:01.000Z",

                                processedAt:
                                    null,

                                failedAt:
                                    "2026-09-19T00:00:02.000Z",

                                attempts:
                                    1,

                                lastError:
                                    "Crash after event creation",
                            }),

                    create:
                        vi.fn(),

                    save:
                        vi.fn()
                            .mockResolvedValue(
                                undefined,
                            ),
                };

                const connectionRepository = {
                    findByRepository:
                        vi.fn()
                            .mockResolvedValue(
                                createConnection(),
                            ),
                };

                const eventRepository = {
                    findByDeliveryId:
                        vi.fn()
                            .mockResolvedValue({
                                id:
                                    "existing-event",
                            }),

                    create:
                        vi.fn(),
                };

                const service =
                    new GitHubWebhookService(
                        deliveryRepository as never,
                        connectionRepository as never,
                        eventRepository as never,
                    );

                const result =
                    await service.handle({
                        deliveryId:
                            "delivery-1",

                        event:
                            "pull_request",

                        payload:
                            createPayload(),
                    });

                expect(
                    result.duplicate,
                ).toBe(true);

                expect(
                    result.relayEventId,
                ).toBe(
                    "existing-event",
                );

                expect(
                    eventRepository.create,
                ).not.toHaveBeenCalled();
            },
        );
    },
);