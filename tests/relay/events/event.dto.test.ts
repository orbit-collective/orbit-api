import {
    describe,
    expect,
    it,
} from "vitest";

import {
    toEventDto,
} from "@/relay/events/event.dto";

import type {
    GitHubRelayEvent,
} from "@/relay/events/event.model";

describe(
    "toEventDto",
    () => {
        it(
            "returns public relay event representation",
            () => {
                const event:
                    GitHubRelayEvent = {
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

                const dto =
                    toEventDto(
                        event,
                    );

                expect(
                    dto,
                ).toEqual({
                    id:
                        "event-1",

                    type:
                        "pull_request",

                    action:
                        "opened",

                    deliveryId:
                        "delivery-1",

                    repository: {
                        id:
                            456,
                    },

                    pullRequestId:
                        789,

                    pullRequestNumber:
                        42,

                    pullRequest: {
                        url:
                            "https://github.com/orbit-collective/orbit/pull/42",

                        body:
                            "<!-- orbit-issue:213769 -->",

                        title:
                            "Fix login redirect",

                        sourceBranch:
                            "fix/login-redirect",

                        targetBranch:
                            "master",

                        draft:
                            false,

                        state:
                            "open",

                        merged:
                            false,

                        mergedAt:
                            null,

                        updatedAt:
                            "2026-09-19T00:00:00.000Z",
                    },

                    createdAt:
                        "2026-09-19T00:00:00.000Z",
                });
            },
        );

        it(
            "returns a check-status shape for a check_suite event without any pull_request metadata",
            () => {
                const event: GitHubRelayEvent = {
                    id: "event-2",
                    connectionId: "connection-1",
                    deliveryId: "delivery-2",
                    type: "check_suite",
                    action: "completed",
                    installationId: 123,
                    repositoryId: 456,
                    pullRequestId: 789,
                    pullRequestNumber: 42,
                    checkStatus: "passed",
                    createdAt: "2026-09-19T00:00:00.000Z",
                    processedAt: null,
                    expiresAt: "2099-01-01T00:00:00.000Z",
                };

                const dto = toEventDto(event);

                expect(dto.check).toEqual({ status: "passed" });
                expect(dto).not.toHaveProperty("pullRequest");
                expect(dto).not.toHaveProperty("review");
            },
        );

        it(
            "returns a review shape for a pull_request_review event",
            () => {
                const event: GitHubRelayEvent = {
                    id: "event-3",
                    connectionId: "connection-1",
                    deliveryId: "delivery-3",
                    type: "pull_request_review",
                    action: "submitted",
                    installationId: 123,
                    repositoryId: 456,
                    pullRequestId: 789,
                    pullRequestNumber: 42,
                    reviewState: "approved",
                    reviewerLogin: "octocat",
                    createdAt: "2026-09-19T00:00:00.000Z",
                    processedAt: null,
                    expiresAt: "2099-01-01T00:00:00.000Z",
                };

                const dto = toEventDto(event);

                expect(dto.review).toEqual({
                    state: "approved",
                    reviewerLogin: "octocat",
                });
                expect(dto).not.toHaveProperty("pullRequest");
                expect(dto).not.toHaveProperty("check");
            },
        );

        it(
            "does not expose internal connection data",
            () => {
                const event:
                    GitHubRelayEvent = {
                    id:
                        "event-1",

                    connectionId:
                        "secret-connection",

                    deliveryId:
                        "delivery",

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
                        1,

                    pullRequestUrl:
                        "https://example.com",

                    pullRequestBody:
                        "",

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

                const dto =
                    toEventDto(
                        event,
                    );

                expect(
                    dto,
                ).not.toHaveProperty(
                    "connectionId",
                );

                expect(
                    dto,
                ).not.toHaveProperty(
                    "installationId",
                );

                expect(
                    dto,
                ).not.toHaveProperty(
                    "processedAt",
                );
            },
        );
    },
);