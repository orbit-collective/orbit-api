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
    parseRef,
    parseRepositoryId,
} from "@/github/development/development-request.validator";

export default async function handler(
    request: Request,
    _context: Context,
): Promise<Response> {
    return handleAuthenticated(
        request,
        "GET",
        async (connection) => {
            const params = new URL(request.url).searchParams;

            return new DevelopmentService().getChecks(
                connection,
                parseRepositoryId(params),
                parseRef(params.get("ref"), "ref"),
            );
        },
    );
}
