import type {
    Context,
} from "@netlify/functions";

import {
    ConnectionService,
} from "@/relay/connections/connection.service";
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
                "POST"
            ) {
                return new Response(
                    null,
                    {
                        status: 405,
                        headers: {
                            Allow: "POST",
                        },
                    },
                );
            }

            const service =
                new ConnectionService();

            const result =
                await service.create();

            return success(
                result,
                201,
            );
        },
    );
}