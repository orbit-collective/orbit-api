import {
    describe,
    expect,
    it,
} from "vitest";

import {
    validateCreateGitHubCommentRequest,
} from "@/github/actions/comment-request.validator";

describe(
    "validateCreateGitHubCommentRequest",
    () => {
        it(
            "accepts valid request",
            () => {
                const result =
                    validateCreateGitHubCommentRequest({
                        eventId:
                            "event-1",

                        pullRequestNumber:
                            283,

                        body:
                            "Synced with Orbit",
                    });

                expect(
                    result,
                ).toEqual({
                    eventId:
                        "event-1",

                    pullRequestNumber:
                        283,

                    body:
                        "Synced with Orbit",
                });
            },
        );

        it(
            "rejects missing event id",
            () => {
                expect(() =>
                    validateCreateGitHubCommentRequest({
                        pullRequestNumber:
                            283,

                        body:
                            "test",
                    }),
                ).toThrow(
                    "eventId is required.",
                );
            },
        );

        it(
            "rejects invalid pull request number",
            () => {
                expect(() =>
                    validateCreateGitHubCommentRequest({
                        eventId:
                            "event-1",

                        pullRequestNumber:
                            0,

                        body:
                            "test",
                    }),
                ).toThrow();
            },
        );

        it(
            "rejects empty comment",
            () => {
                expect(() =>
                    validateCreateGitHubCommentRequest({
                        eventId:
                            "event-1",

                        pullRequestNumber:
                            283,

                        body:
                            "   ",
                    }),
                ).toThrow(
                    "Comment body is required.",
                );
            },
        );
    },
);