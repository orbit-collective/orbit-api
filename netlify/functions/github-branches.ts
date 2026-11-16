import type {
    Context,
} from "@netlify/functions";

import {
    ConnectionAuthenticator,
} from "@/relay/auth/connection-auth";

import {
    BranchService,
} from "@/github/actions/branch.service";

import {
    validateCreateGitHubBranchRequest,
} from "@/github/actions/branch-request.validator";

import {
    DevelopmentService,
} from "@/github/development/development.service";

import {
    handleAuthenticated,
} from "@/github/development/development-handler";

import {
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
    // GET lists a repository's branches; POST creates one.
    if (request.method === "GET") {
        return handleAuthenticated(
            request,
            "GET",
            async (connection) => ({
                branches: await new DevelopmentService().listBranches(
                    connection,
                    parseRepositoryId(
                        new URL(request.url).searchParams,
                    ),
                ),
            }),
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
                validateCreateGitHubBranchRequest(
                    rawBody,
                );

            const service =
                new BranchService();

            const branch =
                await service.create(
                    connection,
                    input,
                );

            return success(
                branch,
                201,
            );
        },
    );
}
