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
    GitHubWebhookDelivery,
} from "@/github/webhooks/delivery.model";

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
    DeliveryRepository,
} = await import(
    "@/github/webhooks/delivery.repository"
    );

let repository:
    InstanceType<
        typeof DeliveryRepository
    >;

let delivery: GitHubWebhookDelivery;

beforeEach(
    () => {
        state.store =
            createFakeStore();

        repository =
            new DeliveryRepository();

        delivery = {
            id: "delivery-1",

            event: "pull_request",

            action: "opened",

            status: "received",

            receivedAt:
                "2026-09-19T00:00:00.000Z",

            processingStartedAt: null,

            processedAt: null,

            failedAt: null,

            attempts: 0,

            lastError: null,
        };
    },
);

describe(
    "DeliveryRepository",
    () => {
        it(
            "stores a new delivery",
            async () => {
                expect(
                    await repository
                        .create(
                            delivery,
                        ),
                ).toBe(true);

                expect(
                    await repository
                        .findById(
                            "delivery-1",
                        ),
                ).toEqual(delivery);
            },
        );

        it(
            "reports a replayed delivery",
            async () => {
                await repository.create(
                    delivery,
                );

                expect(
                    await repository
                        .create(
                            delivery,
                        ),
                ).toBe(false);
            },
        );

        it(
            "returns null for an unknown delivery",
            async () => {
                expect(
                    await repository
                        .findById(
                            "missing",
                        ),
                ).toBeNull();
            },
        );

        it(
            "overwrites an existing delivery on save",
            async () => {
                await repository.create(
                    delivery,
                );

                await repository.save({
                    ...delivery,

                    status:
                        "processed",

                    processedAt:
                        "2026-09-19T00:05:00.000Z",
                });

                expect(
                    (
                        await repository
                            .findById(
                                "delivery-1",
                            )
                    )?.status,
                ).toBe(
                    "processed",
                );
            },
        );
    },
);
