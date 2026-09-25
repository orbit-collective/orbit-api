import type {
    Context,
} from "@netlify/functions";

import {
    ConnectionAuthenticator,
} from "@/relay/auth/connection-auth";
import {
    toConnectionDto,
} from "@/relay/connections/connection.dto";
import {
    RepositoryService,
} from "@/relay/repositories/repository.service";
import {
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

            const repositoryService =
                new RepositoryService();

            const repositories =
                await repositoryService
                    .listForConnection(
                        connection,
                    );

            return success(
                toConnectionDto(
                    connection,
                    repositories,
                ),
            );
        },
    );
}