import {
    now,
} from "@/shared/time";

import type {
    GitHubConnection,
} from "./connection.model";

import {
    ConnectionRepository,
} from "./connection.repository";

export class ConnectionRevokeService {
    public constructor(
        private readonly repository =
        new ConnectionRepository(),
    ) {}

    public async revoke(
        connection: GitHubConnection,
    ): Promise<void> {
        if (
            connection.status ===
            "revoked"
        ) {
            return;
        }

        connection.status =
            "revoked";

        connection.revokedAt =
            now();

        await this.repository
            .save(
                connection,
            );
    }
}