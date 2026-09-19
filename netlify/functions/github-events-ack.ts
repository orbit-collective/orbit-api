import type {
    Config,
    Context,
} from "@netlify/functions";

import {
    ConnectionAuthenticator,
} from "@/relay/auth/connection-auth";

import {
    EventService,
} from "@/relay/events/event.service";

import {
    ApiError,
    handleRequest,
} from "@/shared/errors";

import {
    success,
} from "@/shared/http";

export default async function handler(
    request: Request,
    context: Context,
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

            const authenticator =
                new ConnectionAuthenticator();

            const connection =
                await authenticator
                    .authenticate(
                        request,
                    );

            const eventId =
                context.params.eventId;

            if (!eventId) {
                throw new ApiError(
                    "MISSING_EVENT_ID",
                    "Relay event ID is required.",
                    400,
                );
            }

            const service =
                new EventService();

            await service
                .acknowledge(
                    connection.id,
                    eventId,
                );

            return success({
                acknowledged:
                    true,

                eventId,
            });
        },
    );
}

export const config: Config = {
    path: "/v1/github/events/:eventId/ack",
};