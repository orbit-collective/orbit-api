import {
    ApiError,
} from "@/shared/errors";

import type {
    CreateGitHubPullRequestRequest,
} from "./pull-request-request.model";

function requireNonEmptyString(
    input: Record<string, unknown>,
    field: string,
    code: string,
    message: string,
): string {
    const value =
        input[field];

    if (
        typeof value !==
        "string" ||
        value.trim() ===
        ""
    ) {
        throw new ApiError(
            code,
            message,
            400,
        );
    }

    return value;
}

export function validateCreateGitHubPullRequestRequest(
    value: unknown,
): CreateGitHubPullRequestRequest {
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

    const repositoryId =
        input.repositoryId;

    if (
        typeof repositoryId !==
        "number" ||
        !Number.isSafeInteger(
            repositoryId,
        ) ||
        repositoryId <= 0
    ) {
        throw new ApiError(
            "INVALID_REPOSITORY_ID",
            "repositoryId must be a positive integer.",
            400,
        );
    }

    const title =
        requireNonEmptyString(
            input,
            "title",
            "INVALID_TITLE",
            "title is required.",
        );

    const head =
        requireNonEmptyString(
            input,
            "head",
            "INVALID_HEAD_BRANCH",
            "head is required.",
        );

    const base =
        requireNonEmptyString(
            input,
            "base",
            "INVALID_BASE_BRANCH",
            "base is required.",
        );

    const body =
        typeof input.body ===
        "string"
            ? input.body
            : "";

    if (
        title.length >
        256
    ) {
        throw new ApiError(
            "TITLE_TOO_LONG",
            "title is too long.",
            400,
        );
    }

    if (
        body.length >
        65536
    ) {
        throw new ApiError(
            "PULL_REQUEST_BODY_TOO_LONG",
            "Pull request body is too long.",
            400,
        );
    }

    return {
        repositoryId,
        title: title.trim(),
        head: head.trim(),
        base: base.trim(),
        body,
    };
}
