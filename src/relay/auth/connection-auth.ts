import { sha256 } from "@/security/hash";
import { ApiError } from "@/shared/errors";

import {
    ConnectionRepository,
} from "../connections/connection.repository";
import type {
    GitHubConnection,
} from "../connections/connection.model";
import {
    getBearerToken,
} from "./bearer";

export class ConnectionAuthenticator {
    public constructor(
        private readonly repository =
        new ConnectionRepository(),
    ) {}

    public async authenticate(
        request: Request,
    ): Promise<GitHubConnection> {
        const token =
            getBearerToken(request);

        if (
            !token.startsWith(
                "orb_local_",
            )
        ) {
            throw new ApiError(
                "INVALID_RELAY_TOKEN",
                "Relay token is invalid.",
                401,
            );
        }

        const tokenHash =
            sha256(token);

        const connection =
            await this.repository
                .findByTokenHash(
                    tokenHash,
                );

        if (!connection) {
            throw new ApiError(
                "INVALID_RELAY_TOKEN",
                "Relay token is invalid.",
                401,
            );
        }

        if (
            connection.status ===
            "revoked"
        ) {
            throw new ApiError(
                "CONNECTION_REVOKED",
                "This connection has been revoked.",
                401,
            );
        }

        return connection;
    }
}