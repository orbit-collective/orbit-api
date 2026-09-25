import type {
    Context,
} from "@netlify/functions";

import {
    ConnectionAuthenticator,
} from "@/relay/auth/connection-auth";

import {
    RepositoryService,
} from "@/relay/repositories/repository.service";

import {
    toRepositoryDto,
} from "@/relay/repositories/repository.dto";

import {
    validateAddGitHubRepositoryRequest,
} from "@/relay/repositories/repository-request.validator";

import {
    ApiError,
    handleRequest,
} from "@/shared/errors";

import {
    success,
} from "@/shared/http";

/**
 * GET lists every repository currently connected for this project's
 * connection. POST adds one, validated against the repositories the
 * GitHub App installation itself actually grants access to - never a
 * caller-supplied owner/name taken on faith. See
 * netlify/functions/github-repositories-delete.ts for removal.
 */
export default async function handler(
    request: Request,
    _context: Context,
): Promise<Response> {
    return handleRequest(
        async () => {
            if (
                request.method !== "GET" &&
                request.method !== "POST"
            ) {
                return new Response(
                    null,
                    {
                        status: 405,

                        headers: {
                            Allow: "GET, POST",
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

            const repositoryService =
                new RepositoryService();

            if (
                request.method ===
                "GET"
            ) {
                const repositories =
                    await repositoryService
                        .listForConnection(
                            connection,
                        );

                return success({
                    repositories:
                        repositories.map(
                            toRepositoryDto,
                        ),
                });
            }

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
                validateAddGitHubRepositoryRequest(
                    rawBody,
                );

            const repository =
                await repositoryService.add(
                    connection,
                    input.repositoryId,
                );

            return success(
                toRepositoryDto(
                    repository,
                ),
                201,
            );
        },
    );
}
