import type {
    Context,
} from "@netlify/functions";

import {
    GitHubCallbackService,
} from "@/github/installations/github-callback.service";

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

            const installationIdRaw =
                url.searchParams.get(
                    "installation_id",
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
                    "GitHub connection state is missing.",
                    400,
                );
            }

            if (
                !installationIdRaw
            ) {
                throw new ApiError(
                    "MISSING_INSTALLATION_ID",
                    "GitHub installation ID is missing.",
                    400,
                );
            }

            const installationId =
                Number(
                    installationIdRaw,
                );

            if (
                !Number.isSafeInteger(
                    installationId,
                ) ||
                installationId <= 0
            ) {
                throw new ApiError(
                    "INVALID_INSTALLATION_ID",
                    "GitHub installation ID is invalid.",
                    400,
                );
            }

            const service =
                new GitHubCallbackService();

            const connection =
                await service.handle(
                    code,
                    state,
                    installationId,
                );

            return success({
                connection,

                message:
                    "GitHub repository connected successfully.",
            });
        },
    );
}