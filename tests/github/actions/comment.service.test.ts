import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    CommentService,
} from "@/github/actions/comment.service";

import type {
    GitHubConnection,
} from "@/relay/connections/connection.model";

import type {
    GitHubRelayEvent,
} from "@/relay/events/event.model";

function connection():
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

function event():
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
            999,

        pullRequestNumber:
            283,

        pullRequestUrl:
            "https://github.com/orbit-collective/orbit/pull/283",

        pullRequestBody:
            "<!-- orbit-issue:213769 -->",

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

        processedAt:
            null,

        expiresAt:
            "2099-01-01T00:00:00.000Z",
    };
}

describe(
    "CommentService",
    () => {
        it(
            "posts GitHub comment",
            async () => {
                const eventRepository = {
                    findById:
                        vi.fn()
                            .mockResolvedValue(
                                event(),
                            ),
                };

                const commentRepository = {
                    findByEvent:
                        vi.fn()
                            .mockResolvedValue(
                                null,
                            ),

                    create:
                        vi.fn()
                            .mockResolvedValue(
                                true,
                            ),
                };

                const tokenService = {
                    create:
                        vi.fn()
                            .mockResolvedValue({
                                token:
                                    "installation-token",
                            }),
                };

                const githubClient = {
                    create:
                        vi.fn()
                            .mockResolvedValue({
                                id:
                                    111,

                                html_url:
                                    "https://github.com/comment",

                                body:
                                    "Synced",

                                user: {
                                    login:
                                        "orbit-project-management[bot]",
                                },
                            }),
                };

                const service =
                    new CommentService(
                        eventRepository as never,
                        commentRepository as never,
                        tokenService as never,
                        githubClient as never,
                    );

                const result =
                    await service.create(
                        connection(),
                        {
                            eventId:
                                "event-1",

                            pullRequestNumber:
                                283,

                            body:
                                "Synced with Orbit",
                        },
                    );

                expect(
                    result.duplicate,
                ).toBe(false);

                expect(
                    githubClient.create,
                ).toHaveBeenCalledWith(
                    "installation-token",
                    "orbit-collective",
                    "orbit",
                    283,
                    "Synced with Orbit",
                );
            },
        );

        it(
            "returns existing comment instead of posting again",
            async () => {
                const eventRepository = {
                    findById:
                        vi.fn()
                            .mockResolvedValue(
                                event(),
                            ),
                };

                const commentRepository = {
                    findByEvent:
                        vi.fn()
                            .mockResolvedValue({
                                githubCommentId:
                                    111,

                                githubCommentUrl:
                                    "https://github.com/comment",
                            }),

                    create:
                        vi.fn(),
                };

                const tokenService = {
                    create:
                        vi.fn(),
                };

                const githubClient = {
                    create:
                        vi.fn(),
                };

                const service =
                    new CommentService(
                        eventRepository as never,
                        commentRepository as never,
                        tokenService as never,
                        githubClient as never,
                    );

                const result =
                    await service.create(
                        connection(),
                        {
                            eventId:
                                "event-1",

                            pullRequestNumber:
                                283,

                            body:
                                "Synced with Orbit",
                        },
                    );

                expect(
                    result.duplicate,
                ).toBe(true);

                expect(
                    githubClient.create,
                ).not.toHaveBeenCalled();
            },
        );

        it(
            "rejects pull request number that does not match event",
            async () => {
                const eventRepository = {
                    findById:
                        vi.fn()
                            .mockResolvedValue(
                                event(),
                            ),
                };

                const commentRepository = {
                    findByEvent:
                        vi.fn(),

                    create:
                        vi.fn(),
                };

                const tokenService = {
                    create:
                        vi.fn(),
                };

                const githubClient = {
                    create:
                        vi.fn(),
                };

                const service =
                    new CommentService(
                        eventRepository as never,
                        commentRepository as never,
                        tokenService as never,
                        githubClient as never,
                    );

                await expect(
                    service.create(
                        connection(),
                        {
                            eventId:
                                "event-1",

                            pullRequestNumber:
                                999,

                            body:
                                "test",
                        },
                    ),
                ).rejects.toThrow(
                    "Pull request number does not match the relay event.",
                );

                expect(
                    githubClient.create,
                ).not.toHaveBeenCalled();
            },
        );

        it(
            "does not allow access to event from another connection",
            async () => {
                const eventRepository = {
                    findById:
                        vi.fn()
                            .mockResolvedValue(
                                null,
                            ),
                };

                const commentRepository = {
                    findByEvent:
                        vi.fn(),

                    create:
                        vi.fn(),
                };

                const tokenService = {
                    create:
                        vi.fn(),
                };

                const githubClient = {
                    create:
                        vi.fn(),
                };

                const service =
                    new CommentService(
                        eventRepository as never,
                        commentRepository as never,
                        tokenService as never,
                        githubClient as never,
                    );

                await expect(
                    service.create(
                        connection(),
                        {
                            eventId:
                                "other-connection-event",

                            pullRequestNumber:
                                283,

                            body:
                                "test",
                        },
                    ),
                ).rejects.toThrow(
                    "Relay event could not be found.",
                );

                expect(
                    githubClient.create,
                ).not.toHaveBeenCalled();
            },
        );
    },
);