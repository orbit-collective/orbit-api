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

            const code =
                url.searchParams.get(
                    "code",
                );

            const state =
                url.searchParams.get(
                    "state",
                );

            if (!code) {
                throw new ApiError(
                    "MISSING_OAUTH_CODE",
                    "GitHub OAuth code is missing.",
                    400,
                );
            }

            if (!state) {
                throw new ApiError(
                    "MISSING_STATE",
                    "GitHub login state is missing.",
                    400,
                );
            }

            const service =
                new GitHubLoginService();

            const { redirectUrl } =
                await service.callback(
                    code,
                    state,
                );

            return Response.redirect(
                redirectUrl,
                302,
            );
        },
    );
}
