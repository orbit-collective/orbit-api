import { sha256 } from "@/security/hash";
import {
    generateId,
    generateRelayToken,
    generateStateToken,
} from "@/security/token";
import { now } from "@/shared/time";

import type { GitHubConnection } from "./connection.model";

const STATE_TTL_MINUTES = 15;

export interface CreatedConnection {
    connection: GitHubConnection;

    token: string;

    state: string;
}

export function createConnection(): CreatedConnection {
    const token = generateRelayToken();
    const state = generateStateToken();

    const createdAt = now();

    const stateExpiresAt = new Date(
        Date.now() +
        STATE_TTL_MINUTES * 60 * 1000,
    ).toISOString();

    const connection: GitHubConnection = {
        id: generateId(),

        status: "pending",

        tokenHash: sha256(token),

        stateHash: sha256(state),
        stateExpiresAt,

        installationId: null,

        repositoryId: null,

        repositoryOwner: null,

        repositoryName: null,

        createdAt,

        connectedAt: null,

        revokedAt: null,
    };

    return {
        connection,
        token,
        state,
    };
}