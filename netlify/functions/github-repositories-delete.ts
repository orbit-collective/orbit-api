import type {
    Config,
    Context,
} from "@netlify/functions";

import {
    ConnectionAuthenticator,
} from "@/relay/auth/connection-auth";

import {
    RepositoryService,
} from "@/relay/repositories/repository.service";

import {
    ApiError,
    handleRequest,
} from "@/shared/errors";

import {
    success,
} from "@/shared/http";

export default async function handler(
    request: Request,
    context: Context,
): Promise<Response> {
    return handleRequest(
        async () => {
            if (
                request.method !==
                "DELETE"
            ) {
                return new Response(
                    null,
                    {
                        status: 405,

                        headers: {
                            Allow: "DELETE",
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

            const rawRepositoryId =
                context.params
                    .repositoryId;

            const repositoryId =
                Number(
                    rawRepositoryId,
                );

            if (
                !rawRepositoryId ||
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

            const repositoryService =
                new RepositoryService();

            await repositoryService.remove(
                connection,
                repositoryId,
            );

            return success({
                removed: true,

                repositoryId,
            });
        },
    );
}

export const config: Config = {
    path: "/v1/github/repositories/:repositoryId",
};
