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
    parseRefs,
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

            const service = new DevelopmentService();

            const repositoryId = parseRepositoryId(params);

            const refs = parseRefs(params);

            // `refs` asks for several commits at once, `ref` for one.
            return refs
                ? {
                    checks: await service.getChecksBatch(
                        connection,
                        repositoryId,
                        refs,
                    ),
                }
                : service.getChecks(
                    connection,
                    repositoryId,
                    parseRef(params.get("ref"), "ref"),
                );
        },
    );
}
