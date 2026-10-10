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
    GitHubRelayEvent,
} from "@/relay/events/event.model";

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
    EventRepository,
} = await import(
    "@/relay/events/event.repository"
    );

function createEvent(
    overrides:
        Partial<GitHubRelayEvent> = {},
): GitHubRelayEvent {
    return {
        id: "event-1",

        connectionId:
            "connection-1",

        deliveryId:
            "delivery-1",

        type: "pull_request",

        action: "opened",

        installationId: 123,

        repositoryId: 456,

        pullRequestId: 789,

        pullRequestNumber: 7,

        pullRequestUrl:
            "https://github.com/orbit-collective/orbit/pull/7",

        pullRequestBody:
            "body",

        pullRequestTitle:
            "Fix login redirect",

        pullRequestSourceBranch:
            "fix/login-redirect",

        pullRequestTargetBranch:
            "master",

        pullRequestDraft:
            false,

        pullRequestState:
            "open",

        pullRequestMerged:
            false,

        pullRequestMergedAt:
            null,

        pullRequestUpdatedAt:
            "2026-09-19T00:00:00.000Z",

        createdAt:
            "2026-09-19T00:00:00.000Z",

        processedAt: null,

        expiresAt:
            "2099-01-01T00:00:00.000Z",

        ...overrides,
    };
}

let repository:
    InstanceType<
        typeof EventRepository
    >;

beforeEach(
    () => {
        state.store =
            createFakeStore();

        repository =
            new EventRepository();
    },
);

describe(
    "EventRepository",
    () => {
        it(
            "stores the event with its delivery lookup",
            async () => {
                const event =
                    createEvent();

                await repository.create(
                    event,
                );

                expect([
                    ...state.store!
                        .entries
                        .keys(),
                ]).toEqual([
                    "events/connection-1/event-1",
                    "event-delivery/connection-1/delivery-1",
                ]);
            },
        );

        it(
            "rejects a duplicated event id",
            async () => {
                const event =
                    createEvent();

                await repository.create(
                    event,
                );

                await expect(
                    repository.create(
                        event,
                    ),
                ).rejects.toThrow(
                    "Relay event event-1 already exists.",
                );
            },
        );

        it(
            "finds an event by id",
            async () => {
                const event =
                    createEvent();

                await repository.create(
                    event,
                );

                expect(
                    await repository
                        .findById(
                            "connection-1",
                            "event-1",
                        ),
                ).toEqual(event);

                expect(
                    await repository
                        .findById(
                            "connection-1",
                            "missing",
                        ),
                ).toBeNull();
            },
        );

        it(
            "finds an event by delivery id",
            async () => {
                const event =
                    createEvent();

                await repository.create(
                    event,
                );

                expect(
                    await repository
                        .findByDeliveryId(
                            "connection-1",
                            "delivery-1",
                        ),
                ).toEqual(event);

                expect(
                    await repository
                        .findByDeliveryId(
                            "connection-1",
                            "unknown",
                        ),
                ).toBeNull();
            },
        );

        it(
            "lists pending events oldest first",
            async () => {
                await repository.create(
                    createEvent({
                        id: "event-2",

                        deliveryId:
                            "delivery-2",

                        createdAt:
                            "2026-09-19T00:02:00.000Z",
                    }),
                );

                await repository.create(
                    createEvent({
                        id: "event-1",

                        deliveryId:
                            "delivery-1",

                        createdAt:
                            "2026-09-19T00:01:00.000Z",
                    }),
                );

                const pending =
                    await repository
                        .listPending(
                            "connection-1",
                        );

                expect(
                    pending.map(
                        event =>
                            event.id,
                    ),
                ).toEqual([
                    "event-1",
                    "event-2",
                ]);
            },
        );

        it(
            "skips processed and expired events",
            async () => {
                await repository.create(
                    createEvent({
                        id: "event-processed",

                        deliveryId:
                            "delivery-processed",

                        processedAt:
                            "2026-09-19T00:05:00.000Z",
                    }),
                );

                await repository.create(
                    createEvent({
                        id: "event-expired",

                        deliveryId:
                            "delivery-expired",

                        expiresAt:
                            "2020-01-01T00:00:00.000Z",
                    }),
                );

                await repository.create(
                    createEvent({
                        id: "event-pending",

                        deliveryId:
                            "delivery-pending",
                    }),
                );

                const pending =
                    await repository
                        .listPending(
                            "connection-1",
                        );

                expect(
                    pending.map(
                        event =>
                            event.id,
                    ),
                ).toEqual([
                    "event-pending",
                ]);
            },
        );

        it(
            "applies the requested limit",
            async () => {
                await repository.create(
                    createEvent({
                        id: "event-1",

                        deliveryId:
                            "delivery-1",

                        createdAt:
                            "2026-09-19T00:01:00.000Z",
                    }),
                );

                await repository.create(
                    createEvent({
                        id: "event-2",

                        deliveryId:
                            "delivery-2",

                        createdAt:
                            "2026-09-19T00:02:00.000Z",
                    }),
                );

                const pending =
                    await repository
                        .listPending(
                            "connection-1",
                            1,
                        );

                expect(
                    pending.map(
                        event =>
                            event.id,
                    ),
                ).toEqual([
                    "event-1",
                ]);
            },
        );

        it(
            "marks an event as processed",
            async () => {
                await repository.create(
                    createEvent(),
                );

                const updated =
                    await repository
                        .markProcessed(
                            "connection-1",
                            "event-1",
                            "2026-09-19T00:05:00.000Z",
                        );

                expect(
                    updated?.processedAt,
                ).toBe(
                    "2026-09-19T00:05:00.000Z",
                );

                expect(
                    (
                        await repository
                            .findById(
                                "connection-1",
                                "event-1",
                            )
                    )?.processedAt,
                ).toBe(
                    "2026-09-19T00:05:00.000Z",
                );
            },
        );

        it(
            "returns null when marking an unknown event",
            async () => {
                expect(
                    await repository
                        .markProcessed(
                            "connection-1",
                            "missing",
                            "2026-09-19T00:05:00.000Z",
                        ),
                ).toBeNull();
            },
        );
    },
);


describe(
    "EventRepository.listPending at scale",
    () => {
        const seed = async (
            count: number,
            overrides: (
                index: number,
            ) => Partial<GitHubRelayEvent> = () => ({}),
        ) => {
            for (let i = 0; i < count; i++) {
                await repository.create(
                    createEvent({
                        id: `event-${i}`,

                        deliveryId:
                            `delivery-${i}`,

                        createdAt:
                            new Date(
                                Date.UTC(
                                    2026,
                                    8,
                                    19,
                                    0,
                                    i,
                                ),
                            ).toISOString(),

                        ...overrides(i),
                    }),
                );
            }
        };

        it(
            "reads the stored events in parallel instead of one after another",
            async () => {
                await seed(40);

                const store =
                    state.store!;
                const originalGet =
                    store.get.bind(
                        store,
                    );
                let active = 0;
                let peak = 0;

                store.get =
                    async (
                        key,
                        options,
                    ) => {
                        active++;
                        peak = Math.max(
                            peak,
                            active,
                        );

                        await new Promise(
                            resolve =>
                                setTimeout(
                                    resolve,
                                    1,
                                ),
                        );

                        active--;

                        return originalGet(
                            key,
                            options,
                        );
                    };

                const pending =
                    await repository
                        .listPending(
                            "connection-1",
                        );

                expect(
                    pending,
                ).toHaveLength(40);

                expect(peak)
                    .toBeGreaterThan(1);

                expect(peak)
                    .toBeLessThanOrEqual(
                        16,
                    );
            },
        );

        it(
            "purges expired events and their delivery lookup",
            async () => {
                await seed(
                    4,
                    index => index < 2
                        ? {
                            expiresAt:
                                "2020-01-01T00:00:00.000Z",
                        }
                        : {},
                );

                const entries =
                    state.store!.entries;

                expect(
                    entries.has(
                        "events/connection-1/event-0",
                    ),
                ).toBe(true);

                const pending =
                    await repository
                        .listPending(
                            "connection-1",
                        );

                expect(
                    pending.map(
                        event => event.id,
                    ),
                ).toEqual([
                    "event-2",
                    "event-3",
                ]);

                for (const id of [0, 1]) {
                    expect(
                        entries.has(
                            `events/connection-1/event-${id}`,
                        ),
                    ).toBe(false);

                    expect(
                        entries.has(
                            `event-delivery/connection-1/delivery-${id}`,
                        ),
                    ).toBe(false);
                }

                expect(
                    entries.has(
                        "events/connection-1/event-2",
                    ),
                ).toBe(true);
            },
        );

        it(
            "keeps processed events that have not expired, so a repeated ack stays a no-op",
            async () => {
                await seed(
                    2,
                    index => index === 0
                        ? {
                            processedAt:
                                "2026-09-19T00:05:00.000Z",
                        }
                        : {},
                );

                const pending =
                    await repository
                        .listPending(
                            "connection-1",
                        );

                expect(
                    pending.map(
                        event => event.id,
                    ),
                ).toEqual([
                    "event-1",
                ]);

                expect(
                    state.store!.entries.has(
                        "events/connection-1/event-0",
                    ),
                ).toBe(true);
            },
        );

        it(
            "does not touch another connection's events",
            async () => {
                await repository.create(
                    createEvent({
                        id: "other-event",

                        connectionId:
                            "connection-2",

                        deliveryId:
                            "other-delivery",

                        expiresAt:
                            "2020-01-01T00:00:00.000Z",
                    }),
                );

                await repository
                    .listPending(
                        "connection-1",
                    );

                expect(
                    state.store!.entries.has(
                        "events/connection-2/other-event",
                    ),
                ).toBe(true);
            },
        );

        it(
            "caps how many expired events one listing purges",
            async () => {
                await seed(
                    130,
                    () => ({
                        expiresAt:
                            "2020-01-01T00:00:00.000Z",
                    }),
                );

                await repository
                    .listPending(
                        "connection-1",
                    );

                const remaining =
                    [
                        ...state.store!
                            .entries
                            .keys(),
                    ].filter(
                        key =>
                            key.startsWith(
                                "events/connection-1/",
                            ),
                    );

                expect(
                    remaining,
                ).toHaveLength(30);
            },
        );

        it(
            "still lists pending events when a purge fails",
            async () => {
                await seed(
                    2,
                    index => index === 0
                        ? {
                            expiresAt:
                                "2020-01-01T00:00:00.000Z",
                        }
                        : {},
                );

                state.store!.delete =
                    async () => {
                        throw new Error(
                            "storage unavailable",
                        );
                    };

                const warn =
                    vi.spyOn(
                        console,
                        "warn",
                    ).mockImplementation(
                        () => {},
                    );

                const pending =
                    await repository
                        .listPending(
                            "connection-1",
                        );

                expect(
                    pending.map(
                        event => event.id,
                    ),
                ).toEqual([
                    "event-1",
                ]);

                expect(warn)
                    .toHaveBeenCalledOnce();

                warn.mockRestore();
            },
        );
    },
);
