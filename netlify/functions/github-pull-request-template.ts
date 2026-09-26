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
                "GET"
            ) {
                return new Response(
                    null,
                    {
                        status: 405,

                        headers: {
                            Allow: "GET",
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

            const url =
                new URL(
                    request.url,
                );

            const repositoryIdParam =
                url.searchParams.get(
                    "repositoryId",
                );

            const repositoryId =
                repositoryIdParam !==
                null
                    ? Number(
                        repositoryIdParam,
                    )
                    : NaN;

            if (
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

            const service =
                new PullRequestService();

            const template =
                await service.getTemplate(
                    connection,
                    repositoryId,
                );

            return success({
                template,
            });
        },
    );
}
