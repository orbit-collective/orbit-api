import type {
    Context,
} from "@netlify/functions";

import {
    createConnection,
} from "@/relay/connections/connection.factory";
import {
    ConnectionRepository,
} from "@/relay/connections/connection.repository";
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
    return handleRequest(async () => {
        if (
            request.method !== "POST"
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

        const {
            connection,
            token,
        } = createConnection();

        const repository =
            new ConnectionRepository();

        await repository.create(
            connection,
        );

        const stored =
            await repository.findById(
                connection.id,
            );

        return success({
            connection: stored,

            token,
        });
    });
}