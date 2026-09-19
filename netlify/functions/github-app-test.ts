import type {
    Context,
} from "@netlify/functions";

import {
    GitHubAppService,
} from "@/github/app-auth/github-app.service";
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

            const service =
                new GitHubAppService();

            const app =
                await service
                    .getAuthenticatedApp();

            return success({
                id: app.id,
                slug: app.slug,
                name: app.name,

                owner:
                app.owner.login,

                url:
                app.html_url,
            });
        },
    );
}