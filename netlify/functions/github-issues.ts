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
    parsePagination,
    parsePullRequestState,
    parseRepositoryId,
    parseSince,
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

            return new DevelopmentService().listIssues(
                connection,
                parseRepositoryId(params),
                parsePullRequestState(params),
                page,
                perPage,
                parseSince(params),
            );
        },
    );
}
