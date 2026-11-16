import type {
    Context,
} from "@netlify/functions";

import {
    DevelopmentService,
} from "@/github/development/development.service";

import {
    handleAuthenticated,
} from "@/github/development/development-handler";

import {
    validateUpdatePullRequestRequest,
} from "@/github/development/development-request.validator";

import {
    ApiError,
} from "@/shared/errors";

export default async function handler(
    request: Request,
    _context: Context,
): Promise<Response> {
    return handleAuthenticated(
        request,
        "POST",
        async (connection) => {
            let rawBody: unknown;

            try {
                rawBody = await request.json();
            } catch {
                throw new ApiError(
                    "INVALID_JSON",
                    "Request body must contain valid JSON.",
                    400,
                );
            }

            return new DevelopmentService().updatePullRequest(
                connection,
                validateUpdatePullRequestRequest(rawBody),
            );
        },
    );
}
