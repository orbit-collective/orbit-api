import {
    ApiError,
} from "@/shared/errors";

import type {
    CreateGitHubBranchRequest,
} from "./branch-request.model";

/**
 * A conservative subset of what Git actually allows in a ref name - rejects
 * anything that could be surprising or ambiguous (spaces, "..", a leading/
 * trailing "/", control-ish punctuation) rather than trying to mirror git's
 * full check-ref-format rules.
 */
const VALID_BRANCH_NAME =
    /^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/;

export function validateCreateGitHubBranchRequest(
    value: unknown,
): CreateGitHubBranchRequest {
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

    const name =
        input.name;

    const baseBranch =
        input.baseBranch;

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

    if (
        typeof name !==
        "string" ||
        !VALID_BRANCH_NAME.test(
            name,
        ) ||
        name.includes(
            "..",
        )
    ) {
        throw new ApiError(
            "INVALID_BRANCH_NAME",
            "name must be a valid git branch name.",
            400,
        );
    }

    if (
        baseBranch !==
        undefined &&
        (typeof baseBranch !==
            "string" ||
            baseBranch.trim() ===
            "")
    ) {
        throw new ApiError(
            "INVALID_BASE_BRANCH",
            "baseBranch must be a non-empty string when provided.",
            400,
        );
    }

    return {
        repositoryId,
        name,
        baseBranch:
            baseBranch as
                | string
                | undefined,
    };
}
