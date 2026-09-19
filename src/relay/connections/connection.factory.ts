import {
    generateId,
    generateRelayToken,
} from "@/security/token";
import { sha256 } from "@/security/hash";
import { now } from "@/shared/time";

import type { GitHubConnection } from "./connection.model";

export interface CreatedConnection {
    connection: GitHubConnection;

    token: string;
}

export function createConnection():
    CreatedConnection {
    const token = generateRelayToken();

    const connection: GitHubConnection = {
        id: generateId(),

        status: "pending",

        tokenHash: sha256(token),

        installationId: null,

        repositoryId: null,

        repositoryOwner: null,

        repositoryName: null,

        createdAt: now(),

        connectedAt: null,

        revokedAt: null,
    };

    return {
        connection,
        token,
    };
}