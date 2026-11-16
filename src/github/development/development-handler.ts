import {
    ConnectionAuthenticator,
} from "@/relay/auth/connection-auth";

import type {
    GitHubConnection,
} from "@/relay/connections/connection.model";

import {
    handleRequest,
} from "@/shared/errors";

import {
    success,
} from "@/shared/http";

/**
 * The shared skeleton of the Development panel's read endpoints: method
 * guard, relay-token authentication, then the caller's own work, whose
 * result is wrapped in the standard success envelope. A 405 names the one
 * method the endpoint accepts.
 */
export function handleAuthenticated(
    request: Request,
    method: "GET" | "POST",
    work: (
        connection: GitHubConnection,
    ) => Promise<unknown>,
    successStatus = 200,
): Promise<Response> {
    return handleRequest(async () => {
        if (request.method !== method) {
            return new Response(null, {
                status: 405,
                headers: { Allow: method },
            });
        }

        const connection =
            await new ConnectionAuthenticator()
                .authenticate(request);

        return success(
            await work(connection),
            successStatus,
        );
    });
}
