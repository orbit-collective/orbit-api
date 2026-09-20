import type {
    Config,
    Context,
} from "@netlify/functions";

import {
    ConnectionAuthenticator,
} from "@/relay/auth/connection-auth";

import {
    ConnectionRevokeService,
} from "@/relay/connections/connection-revoke.service";

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

            const service =
                new ConnectionRevokeService();

            await service.revoke(
                connection,
            );

            return success({
                revoked: true,
            });
        },
    );
}

export const config: Config = {
    path: "/v1/github/connections/revoke",
};