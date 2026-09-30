import type {
    Context,
} from "@netlify/functions";

import {
    GitHubLoginService,
} from "@/auth/github-login/github-login.service";

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

            const body =
                await request.json() as {
                    exchange_token?: unknown;
                };

            const exchangeToken =
                body.exchange_token;

            if (
                typeof exchangeToken !==
                "string" ||
                exchangeToken === ""
            ) {
                throw new ApiError(
                    "MISSING_EXCHANGE_TOKEN",
                    "exchange_token is required.",
                    400,
                );
            }

            const service =
                new GitHubLoginService();

            const identity =
                await service.resolve(
                    exchangeToken,
                );

            return success(identity);
        },
    );
}
