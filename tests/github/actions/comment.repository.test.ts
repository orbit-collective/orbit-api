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
    GitHubCommentRecord,
} from "@/github/actions/comment.model";

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
    CommentRepository,
} = await import(
    "@/github/actions/comment.repository"
    );

let repository:
    InstanceType<
        typeof CommentRepository
    >;

let record: GitHubCommentRecord;

beforeEach(
    () => {
        state.store =
            createFakeStore();

        repository =
            new CommentRepository();

        record = {
            id: "comment-1",

            connectionId:
                "connection-1",

            eventId: "event-1",

            deliveryId:
                "delivery-1",

            repositoryId: 456,

            pullRequestNumber: 7,

            githubCommentId: 1,

            githubCommentUrl:
                "https://github.com/orbit-collective/orbit/pull/7#issuecomment-1",

            createdAt:
                "2026-09-19T00:00:00.000Z",
        };
    },
);

describe(
    "CommentRepository",
    () => {
        it(
            "stores a new comment record",
            async () => {
                expect(
                    await repository
                        .create(
                            record,
                        ),
                ).toBe(true);

                expect(
                    await repository
                        .findByEvent(
                            "connection-1",
                            "event-1",
                        ),
                ).toEqual(record);
            },
        );

        it(
            "reports a duplicated comment record",
            async () => {
                await repository.create(
                    record,
                );

                expect(
                    await repository
                        .create(
                            record,
                        ),
                ).toBe(false);
            },
        );

        it(
            "returns null for an unknown event",
            async () => {
                expect(
                    await repository
                        .findByEvent(
                            "connection-1",
                            "missing",
                        ),
                ).toBeNull();
            },
        );
    },
);
