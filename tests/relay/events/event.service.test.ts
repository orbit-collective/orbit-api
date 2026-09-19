import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    EventService,
} from "@/relay/events/event.service";

import type {
    GitHubRelayEvent,
} from "@/relay/events/event.model";

function createEvent():
    GitHubRelayEvent {
    return {
        id:
            "event-1",

        connectionId:
            "connection-1",

        deliveryId:
            "delivery-1",

        type:
            "pull_request",

        action:
            "opened",

        installationId:
            123,

        repositoryId:
            456,

        pullRequestId:
            789,

        pullRequestNumber:
            42,

        pullRequestUrl:
            "https://github.com/orbit-collective/orbit/pull/42",

        pullRequestBody:
            "<!-- orbit-issue:213769 -->",

        createdAt:
            "2026-09-19T00:00:00.000Z",

        processedAt:
            null,
    };
}

describe(
    "EventService",
    () => {
        it(
            "lists pending events",
            async () => {
                const repository = {
                    listPending:
                        vi.fn()
                            .mockResolvedValue([
                                createEvent(),
                            ]),

                    findById:
                        vi.fn(),

                    markProcessed:
                        vi.fn(),
                };

                const service =
                    new EventService(
                        repository as never,
                    );

                const result =
                    await service
                        .listPending(
                            "connection-1",
                        );

                expect(
                    result,
                ).toHaveLength(1);

                expect(
                    result[0]
                        ?.pullRequest
                        .number,
                ).toBe(42);
            },
        );

        it(
            "acknowledges pending event",
            async () => {
                const repository = {
                    listPending:
                        vi.fn(),

                    findById:
                        vi.fn()
                            .mockResolvedValue(
                                createEvent(),
                            ),

                    markProcessed:
                        vi.fn()
                            .mockResolvedValue(
                                createEvent(),
                            ),
                };

                const service =
                    new EventService(
                        repository as never,
                    );

                await service
                    .acknowledge(
                        "connection-1",
                        "event-1",
                    );

                expect(
                    repository
                        .markProcessed,
                ).toHaveBeenCalledOnce();
            },
        );

        it(
            "treats repeated acknowledgement as success",
            async () => {
                const processed =
                    createEvent();

                processed.processedAt =
                    "2026-09-19T01:00:00.000Z";

                const repository = {
                    listPending:
                        vi.fn(),

                    findById:
                        vi.fn()
                            .mockResolvedValue(
                                processed,
                            ),

                    markProcessed:
                        vi.fn(),
                };

                const service =
                    new EventService(
                        repository as never,
                    );

                await expect(
                    service.acknowledge(
                        "connection-1",
                        "event-1",
                    ),
                ).resolves.toBeUndefined();

                expect(
                    repository
                        .markProcessed,
                ).not.toHaveBeenCalled();
            },
        );

        it(
            "rejects unknown event",
            async () => {
                const repository = {
                    listPending:
                        vi.fn(),

                    findById:
                        vi.fn()
                            .mockResolvedValue(
                                null,
                            ),

                    markProcessed:
                        vi.fn(),
                };

                const service =
                    new EventService(
                        repository as never,
                    );

                await expect(
                    service.acknowledge(
                        "connection-1",
                        "missing",
                    ),
                ).rejects.toThrow(
                    "Relay event could not be found.",
                );
            },
        );
    },
);