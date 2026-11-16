import type {
    Context,
} from "@netlify/functions";

import {
    DevelopmentService,
} from "@/github/development/development.service";

import {
    handleAuthenticated,
} from "@/github/development/development-handler";

import {
    parseRepositoryId,
} from "@/github/development/development-request.validator";

export default async function handler(
    request: Request,
    _context: Context,
): Promise<Response> {
    return handleAuthenticated(
        request,
        "GET",
        async (connection) =>
            new DevelopmentService().getInsights(
                connection,
                parseRepositoryId(
                    new URL(request.url).searchParams,
                ),
            ),
    );
}
