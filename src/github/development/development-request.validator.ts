import {
    ApiError,
} from "@/shared/errors";

import type {
    PullRequestListState,
} from "./development.client";

import type {
    UpdatePullRequestInput,
} from "./development.service";

const MAX_PER_PAGE = 100;

function positiveInteger(
    value: unknown,
    code: string,
    message: string,
): number {
    const parsed =
        typeof value === "string"
            ? Number(value)
            : value;

    if (
        typeof parsed !== "number" ||
        !Number.isSafeInteger(parsed) ||
        parsed <= 0
    ) {
        throw new ApiError(code, message, 400);
    }

    return parsed;
}

export function parseRepositoryId(
    params: URLSearchParams,
): number {
    return positiveInteger(
        params.get("repositoryId"),
        "INVALID_REPOSITORY_ID",
        "repositoryId must be a positive integer.",
    );
}

export function parsePullRequestNumber(
    params: URLSearchParams,
): number | null {
    const value = params.get("number");

    return value === null
        ? null
        : positiveInteger(
            value,
            "INVALID_PULL_REQUEST_NUMBER",
            "number must be a positive integer.",
        );
}

export function parsePagination(
    params: URLSearchParams,
    defaultPerPage = 30,
): { page: number; perPage: number } {
    const page = params.get("page");
    const perPage = params.get("perPage");

    return {
        page:
            page === null
                ? 1
                : positiveInteger(
                    page,
                    "INVALID_PAGE",
                    "page must be a positive integer.",
                ),
        perPage: Math.min(
            perPage === null
                ? defaultPerPage
                : positiveInteger(
                    perPage,
                    "INVALID_PER_PAGE",
                    "perPage must be a positive integer.",
                ),
            MAX_PER_PAGE,
        ),
    };
}

export function parsePullRequestState(
    params: URLSearchParams,
): PullRequestListState {
    const state = params.get("state") ?? "open";

    if (
        state !== "open" &&
        state !== "closed" &&
        state !== "all"
    ) {
        throw new ApiError(
            "INVALID_PULL_REQUEST_STATE",
            "state must be open, closed or all.",
            400,
        );
    }

    return state;
}

/** A git ref (branch name or sha) used in a URL path: no whitespace or odd punctuation. */
const VALID_REF = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/;

export function parseRef(
    value: string | null,
    field: string,
): string {
    if (
        value === null ||
        !VALID_REF.test(value) ||
        value.includes("..")
    ) {
        throw new ApiError(
            "INVALID_REF",
            `${field} must be a valid branch name or commit sha.`,
            400,
        );
    }

    return value;
}

export function parseOptionalBranch(
    params: URLSearchParams,
): string | undefined {
    const branch = params.get("branch");

    return branch === null
        ? undefined
        : parseRef(branch, "branch");
}

export function validateUpdatePullRequestRequest(
    value: unknown,
): UpdatePullRequestInput {
    if (
        typeof value !== "object" ||
        value === null
    ) {
        throw new ApiError(
            "INVALID_REQUEST_BODY",
            "Request body must be a JSON object.",
            400,
        );
    }

    const input = value as Record<string, unknown>;

    const repositoryId = positiveInteger(
        input.repositoryId,
        "INVALID_REPOSITORY_ID",
        "repositoryId must be a positive integer.",
    );

    const number = positiveInteger(
        input.number,
        "INVALID_PULL_REQUEST_NUMBER",
        "number must be a positive integer.",
    );

    const result: UpdatePullRequestInput = {
        repositoryId,
        number,
    };

    if (input.state !== undefined) {
        if (
            input.state !== "open" &&
            input.state !== "closed"
        ) {
            throw new ApiError(
                "INVALID_PULL_REQUEST_STATE",
                "state must be open or closed.",
                400,
            );
        }

        result.state = input.state;
    }

    if (input.title !== undefined) {
        if (
            typeof input.title !== "string" ||
            input.title.trim() === "" ||
            input.title.length > 256
        ) {
            throw new ApiError(
                "INVALID_PULL_REQUEST_TITLE",
                "title must be a non-empty string of at most 256 characters.",
                400,
            );
        }

        result.title = input.title;
    }

    if (input.body !== undefined) {
        if (
            typeof input.body !== "string" ||
            input.body.length > 65536
        ) {
            throw new ApiError(
                "INVALID_PULL_REQUEST_BODY",
                "body must be a string of at most 65536 characters.",
                400,
            );
        }

        result.body = input.body;
    }

    if (
        result.state === undefined &&
        result.title === undefined &&
        result.body === undefined
    ) {
        throw new ApiError(
            "NOTHING_TO_UPDATE",
            "Provide at least one of state, title or body.",
            400,
        );
    }

    return result;
}
