import type {
    Config,
    Context,
} from "@netlify/functions";

import {
    ConnectionAuthenticator,
} from "@/relay/auth/connection-auth";

import {
    TokenRotationService,
} from "@/relay/auth/token-rotation.service";

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
                new TokenRotationService();

            const token =
                await service.rotate(
                    connection,
                );

            return success({
                token,
            });
        },
    );
}

export const config: Config = {
    path: "/v1/github/connections/token/rotate",
};