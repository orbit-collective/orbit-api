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
    DevelopmentService,
} from "@/github/development/development.service";

import {
    handleAuthenticated,
} from "@/github/development/development-handler";

import {
    parsePagination,
    parsePullRequestNumber,
    parsePullRequestState,
    parseRepositoryId,
} from "@/github/development/development-request.validator";

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
    // GET lists a repository's pull requests (or returns one in detail when
    // `number` is given); POST creates one.
    if (request.method === "GET") {
        return handleAuthenticated(
            request,
            "GET",
            async (connection) => {
                const params = new URL(request.url).searchParams;

                const service = new DevelopmentService();

                const repositoryId = parseRepositoryId(params);

                const number = parsePullRequestNumber(params);

                if (number !== null) {
                    return service.getPullRequest(
                        connection,
                        repositoryId,
                        number,
                    );
                }

                const { page, perPage } = parsePagination(params);

                return {
                    pullRequests: await service.listPullRequests(
                        connection,
                        repositoryId,
                        parsePullRequestState(params),
                        page,
                        perPage,
                    ),
                };
            },
        );
    }

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
