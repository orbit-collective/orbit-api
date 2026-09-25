import type {
    Context,
} from "@netlify/functions";

import {
    ConnectionAuthenticator,
} from "@/relay/auth/connection-auth";

import {
    PullRequestService,
} from "@/github/actions/pull-request.service";

import {
    validateCreateGitHubPullRequestRequest,
} from "@/github/actions/pull-request-request.validator";

import {
    ApiError,
    handleRequest,
} from "@/shared/errors";

import {
    success,
} from "@/shared/http";

export default async function handler(
    request: Request,
    _context: Context,
): Promise<Response> {
    return handleRequest(
        async () => {
            if (
                request.method !==
                "POST"
            ) {
                return new Response(
                    null,
                    {
                        status: 405,

                        headers: {
                            Allow: "POST",
                        },
                    },
                );
            }

            const authenticator =
                new ConnectionAuthenticator();

            const connection =
                await authenticator
                    .authenticate(
                        request,
                    );

            let rawBody: unknown;

            try {
                rawBody =
                    await request.json();
            } catch {
                throw new ApiError(
                    "INVALID_JSON",
                    "Request body must contain valid JSON.",
                    400,
                );
            }

            const input =
                validateCreateGitHubPullRequestRequest(
                    rawBody,
                );

            const service =
                new PullRequestService();

            const pullRequest =
                await service.create(
                    connection,
                    input,
                );

            return success(
                pullRequest,
                201,
            );
        },
    );
}
