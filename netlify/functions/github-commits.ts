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
    parseOptionalBranch,
    parsePagination,
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

            const { page, perPage } = parsePagination(params);

            return {
                commits:
                    await new DevelopmentService().listCommits(
                        connection,
                        parseRepositoryId(params),
                        parseOptionalBranch(params),
                        page,
                        perPage,
                    ),
            };
        },
    );
}
