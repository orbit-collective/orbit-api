import {
    sha256,
} from "@/security/hash";

import {
    ApiError,
} from "@/shared/errors";

import {
    ConnectionRepository,
} from "./connection.repository";

import type {
    GitHubConnection,
} from "./connection.model";

export class ConnectionStateService {
    public constructor(
        private readonly repository =
        new ConnectionRepository(),
    ) {}

    public async resolve(
        state: string,
    ): Promise<GitHubConnection> {
        const stateHash =
            sha256(state);

        const connection =
            await this.repository
                .findByStateHash(
                    stateHash,
                );

        if (!connection) {
            throw new ApiError(
                "INVALID_CONNECTION_STATE",
                "Connection state is invalid.",
                400,
            );
        }

        if (
            connection.status !==
            "pending"
        ) {
            throw new ApiError(
                "CONNECTION_NOT_PENDING",
                "Connection is no longer pending.",
                409,
            );
        }

        if (
            Date.parse(
                connection
                    .stateExpiresAt,
            ) <= Date.now()
        ) {
            throw new ApiError(
                "CONNECTION_STATE_EXPIRED",
                "Connection state has expired.",
                410,
            );
        }

        return connection;
    }
}