import type { Context } from "@netlify/functions";

import { handleRequest } from "@/shared/errors";
import { getHealthStatus } from "@/shared/health";
import { success } from "@/shared/http";

export default async function handler(
    request: Request,
    _context: Context,
): Promise<Response> {
    return handleRequest(async () => {
        if (request.method !== "GET") {
            return new Response(null, {
                status: 405,
                headers: {
                    Allow: "GET",
                },
            });
        }

        return success(getHealthStatus());
    });
}