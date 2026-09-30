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

            const url =
                new URL(
                    request.url,
                );

            const returnTo =
                url.searchParams.get(
                    "return_to",
                );

            if (!returnTo) {
                throw new ApiError(
                    "MISSING_RETURN_TO",
                    "return_to is required.",
                    400,
                );
            }

            const service =
                new GitHubLoginService();

            const { url: authorizeUrl } =
                await service.start(
                    returnTo,
                );

            return Response.redirect(
                authorizeUrl,
                302,
            );
        },
    );
}
