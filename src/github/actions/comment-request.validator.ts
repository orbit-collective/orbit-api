import {
    ApiError,
} from "@/shared/errors";

import type {
    CreateGitHubCommentRequest,
} from "./comment-request.model";

export function validateCreateGitHubCommentRequest(
    value: unknown,
): CreateGitHubCommentRequest {
    if (
        typeof value !==
        "object" ||
        value === null
    ) {
        throw new ApiError(
            "INVALID_REQUEST_BODY",
            "Request body must be a JSON object.",
            400,
        );
    }

    const input =
        value as Record<
            string,
            unknown
        >;

    const eventId =
        input.eventId;

    const pullRequestNumber =
        input.pullRequestNumber;

    const body =
        input.body;

    if (
        typeof eventId !==
        "string" ||
        eventId.trim() ===
        ""
    ) {
        throw new ApiError(
            "INVALID_EVENT_ID",
            "eventId is required.",
            400,
        );
    }

    if (
        typeof pullRequestNumber !==
        "number" ||
        !Number.isSafeInteger(
            pullRequestNumber,
        ) ||
        pullRequestNumber <= 0
    ) {
        throw new ApiError(
            "INVALID_PULL_REQUEST_NUMBER",
            "pullRequestNumber must be a positive integer.",
            400,
        );
    }

    if (
        typeof body !==
        "string" ||
        body.trim() ===
        ""
    ) {
        throw new ApiError(
            "INVALID_COMMENT_BODY",
            "Comment body is required.",
            400,
        );
    }

    if (
        body.length >
        65536
    ) {
        throw new ApiError(
            "COMMENT_BODY_TOO_LONG",
            "Comment body is too long.",
            400,
        );
    }

    return {
        eventId:
            eventId.trim(),

        pullRequestNumber,

        body:
            body.trim(),
    };
}