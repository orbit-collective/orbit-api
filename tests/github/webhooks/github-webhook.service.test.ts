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

import type {
    GitHubPullRequestWebhook,
} from "@/github/webhooks/pull-request-webhook.model";

import type {
    GitHubCheckSuiteWebhook,
} from "@/github/webhooks/check-suite-webhook.model";

import type {
    GitHubPullRequestReviewWebhook,
} from "@/github/webhooks/pull-request-review-webhook.model";

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

function createPayload(): GitHubPullRequestWebhook {
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

            state:
                "open",

            merged:
                false,

            merged_at:
                null,

            updated_at:
                "2026-09-19T00:00:00.000Z",

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
            "ignores pull request actions outside the supported lifecycle set",
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
                    "edited";

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

        it.each([
            "reopened",
            "closed",
            "synchronize",
        ] as const)(
            "creates a relay event for a %s action",
            async (action) => {
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

                const payload =
                    createPayload();

                payload.action =
                    action;

                const service =
                    new GitHubWebhookService(
                        deliveryRepository as never,
                        connectionRepository as never,
                        eventRepository as never,
                    );

                const result =
                    await service.handle({
                        deliveryId:
                            "delivery-lifecycle",

                        event:
                            "pull_request",

                        payload,
                    });

                expect(
                    result.ignored,
                ).toBe(false);

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
                    createdEvent.action,
                ).toBe(action);
            },
        );

        it(
            "marks a closed unmerged pull request event with merged false",
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

                const payload =
                    createPayload();

                payload.action =
                    "closed";

                payload.pull_request.merged =
                    false;

                const service =
                    new GitHubWebhookService(
                        deliveryRepository as never,
                        connectionRepository as never,
                        eventRepository as never,
                    );

                await service.handle({
                    deliveryId:
                        "delivery-closed-unmerged",

                    event:
                        "pull_request",

                    payload,
                });

                const createdEvent =
                    eventRepository
                        .create
                        .mock
                        .calls[0]
                        ?.[0];

                expect(
                    createdEvent
                        .pullRequestMerged,
                ).toBe(false);
            },
        );

        it(
            "marks a closed merged pull request event with merged true",
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

                const payload =
                    createPayload();

                payload.action =
                    "closed";

                payload.pull_request.merged =
                    true;

                payload.pull_request.merged_at =
                    "2026-09-24T00:00:00.000Z";

                const service =
                    new GitHubWebhookService(
                        deliveryRepository as never,
                        connectionRepository as never,
                        eventRepository as never,
                    );

                await service.handle({
                    deliveryId:
                        "delivery-closed-merged",

                    event:
                        "pull_request",

                    payload,
                });

                const createdEvent =
                    eventRepository
                        .create
                        .mock
                        .calls[0]
                        ?.[0];

                expect(
                    createdEvent
                        .pullRequestMerged,
                ).toBe(true);

                expect(
                    createdEvent
                        .pullRequestMergedAt,
                ).toBe(
                    "2026-09-24T00:00:00.000Z",
                );
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

        it("creates a relay event for a completed, successful check_suite", async () => {
            const deliveryRepository = {
                findById: vi.fn().mockResolvedValue(null),
                create: vi.fn().mockResolvedValue(true),
                save: vi.fn().mockResolvedValue(undefined),
            };
            const connectionRepository = {
                findByRepository: vi.fn().mockResolvedValue(createConnection()),
            };
            const eventRepository = {
                findByDeliveryId: vi.fn().mockResolvedValue(null),
                create: vi.fn().mockResolvedValue(undefined),
            };

            const service = new GitHubWebhookService(
                deliveryRepository as never,
                connectionRepository as never,
                eventRepository as never,
            );

            const payload: GitHubCheckSuiteWebhook = {
                action: "completed",
                installation: { id: 123 },
                repository: { id: 456 },
                check_suite: {
                    status: "completed",
                    conclusion: "success",
                    pull_requests: [{ id: 999, number: 283 }],
                },
            };

            const result = await service.handle({
                deliveryId: "delivery-2",
                event: "check_suite",
                payload,
            });

            expect(result.ignored).toBe(false);
            expect(eventRepository.create).toHaveBeenCalledOnce();

            const createdEvent = eventRepository.create.mock.calls[0]?.[0];
            expect(createdEvent.type).toBe("check_suite");
            expect(createdEvent.checkStatus).toBe("passed");
            expect(createdEvent.pullRequestNumber).toBe(283);
        });

        it("maps an in-progress check_suite to pending", async () => {
            const deliveryRepository = {
                findById: vi.fn().mockResolvedValue(null),
                create: vi.fn().mockResolvedValue(true),
                save: vi.fn().mockResolvedValue(undefined),
            };
            const connectionRepository = {
                findByRepository: vi.fn().mockResolvedValue(createConnection()),
            };
            const eventRepository = {
                findByDeliveryId: vi.fn().mockResolvedValue(null),
                create: vi.fn().mockResolvedValue(undefined),
            };

            const service = new GitHubWebhookService(
                deliveryRepository as never,
                connectionRepository as never,
                eventRepository as never,
            );

            const payload: GitHubCheckSuiteWebhook = {
                action: "requested",
                installation: { id: 123 },
                repository: { id: 456 },
                check_suite: {
                    status: "in_progress",
                    conclusion: null,
                    pull_requests: [{ id: 999, number: 283 }],
                },
            };

            const result = await service.handle({
                deliveryId: "delivery-3",
                event: "check_suite",
                payload,
            });

            expect(result.ignored).toBe(false);

            const createdEvent = eventRepository.create.mock.calls[0]?.[0];
            expect(createdEvent.checkStatus).toBe("pending");
        });

        it("maps a completed, failed check_suite to failed", async () => {
            const deliveryRepository = {
                findById: vi.fn().mockResolvedValue(null),
                create: vi.fn().mockResolvedValue(true),
                save: vi.fn().mockResolvedValue(undefined),
            };
            const connectionRepository = {
                findByRepository: vi.fn().mockResolvedValue(createConnection()),
            };
            const eventRepository = {
                findByDeliveryId: vi.fn().mockResolvedValue(null),
                create: vi.fn().mockResolvedValue(undefined),
            };

            const service = new GitHubWebhookService(
                deliveryRepository as never,
                connectionRepository as never,
                eventRepository as never,
            );

            const payload: GitHubCheckSuiteWebhook = {
                action: "completed",
                installation: { id: 123 },
                repository: { id: 456 },
                check_suite: {
                    status: "completed",
                    conclusion: "failure",
                    pull_requests: [{ id: 999, number: 283 }],
                },
            };

            const result = await service.handle({
                deliveryId: "delivery-4",
                event: "check_suite",
                payload,
            });

            expect(result.ignored).toBe(false);

            const createdEvent = eventRepository.create.mock.calls[0]?.[0];
            expect(createdEvent.checkStatus).toBe("failed");
        });

        it("ignores a check_suite with no linked pull request", async () => {
            const deliveryRepository = {
                findById: vi.fn().mockResolvedValue(null),
                create: vi.fn().mockResolvedValue(true),
                save: vi.fn().mockResolvedValue(undefined),
            };
            const connectionRepository = { findByRepository: vi.fn() };
            const eventRepository = { findByDeliveryId: vi.fn(), create: vi.fn() };

            const service = new GitHubWebhookService(
                deliveryRepository as never,
                connectionRepository as never,
                eventRepository as never,
            );

            const payload: GitHubCheckSuiteWebhook = {
                action: "completed",
                installation: { id: 123 },
                repository: { id: 456 },
                check_suite: {
                    status: "completed",
                    conclusion: "success",
                    pull_requests: [],
                },
            };

            const result = await service.handle({
                deliveryId: "delivery-5",
                event: "check_suite",
                payload,
            });

            expect(result.ignored).toBe(true);
            expect(connectionRepository.findByRepository).not.toHaveBeenCalled();
        });

        it("creates a relay event for a submitted pull request review", async () => {
            const deliveryRepository = {
                findById: vi.fn().mockResolvedValue(null),
                create: vi.fn().mockResolvedValue(true),
                save: vi.fn().mockResolvedValue(undefined),
            };
            const connectionRepository = {
                findByRepository: vi.fn().mockResolvedValue(createConnection()),
            };
            const eventRepository = {
                findByDeliveryId: vi.fn().mockResolvedValue(null),
                create: vi.fn().mockResolvedValue(undefined),
            };

            const service = new GitHubWebhookService(
                deliveryRepository as never,
                connectionRepository as never,
                eventRepository as never,
            );

            const payload: GitHubPullRequestReviewWebhook = {
                action: "submitted",
                installation: { id: 123 },
                repository: { id: 456 },
                pull_request: { id: 999, number: 283 },
                review: { state: "approved", user: { login: "octocat" } },
            };

            const result = await service.handle({
                deliveryId: "delivery-6",
                event: "pull_request_review",
                payload,
            });

            expect(result.ignored).toBe(false);

            const createdEvent = eventRepository.create.mock.calls[0]?.[0];
            expect(createdEvent.type).toBe("pull_request_review");
            expect(createdEvent.reviewState).toBe("approved");
            expect(createdEvent.reviewerLogin).toBe("octocat");
        });

        it("ignores a review action other than submitted", async () => {
            const deliveryRepository = {
                findById: vi.fn().mockResolvedValue(null),
                create: vi.fn().mockResolvedValue(true),
                save: vi.fn().mockResolvedValue(undefined),
            };
            const connectionRepository = { findByRepository: vi.fn() };
            const eventRepository = { findByDeliveryId: vi.fn(), create: vi.fn() };

            const service = new GitHubWebhookService(
                deliveryRepository as never,
                connectionRepository as never,
                eventRepository as never,
            );

            const payload: GitHubPullRequestReviewWebhook = {
                action: "dismissed",
                installation: { id: 123 },
                repository: { id: 456 },
                pull_request: { id: 999, number: 283 },
                review: { state: "approved", user: { login: "octocat" } },
            };

            const result = await service.handle({
                deliveryId: "delivery-7",
                event: "pull_request_review",
                payload,
            });

            expect(result.ignored).toBe(true);
            expect(connectionRepository.findByRepository).not.toHaveBeenCalled();
        });
    },
);