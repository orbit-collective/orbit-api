import {
    generateRelayToken,
} from "@/security/token";

import {
    sha256,
} from "@/security/hash";

import type {
    GitHubConnection,
} from "@/relay/connections/connection.model";

import {
    ConnectionRepository,
} from "@/relay/connections/connection.repository";

export class TokenRotationService {
    public constructor(
        private readonly repository =
        new ConnectionRepository(),
    ) {}

    public async rotate(
        connection: GitHubConnection,
    ): Promise<string> {
        const token =
            generateRelayToken();

        const oldTokenHash =
            connection.tokenHash;

        connection.tokenHash =
            sha256(token);

        await this.repository
            .replaceTokenLookup(
                connection,
                oldTokenHash,
            );

        return token;
    }
}