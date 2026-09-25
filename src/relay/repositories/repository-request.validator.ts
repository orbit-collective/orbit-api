import {
    ApiError,
} from "@/shared/errors";

export interface AddGitHubRepositoryRequest {
    repositoryId: number;
}

export function validateAddGitHubRepositoryRequest(
    value: unknown,
): AddGitHubRepositoryRequest {
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

    const repositoryId =
        (value as Record<string, unknown>)
            .repositoryId;

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

    return {
        repositoryId,
    };
}
