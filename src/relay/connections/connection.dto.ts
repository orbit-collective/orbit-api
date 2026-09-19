import type {
    GitHubConnection,
    GitHubConnectionStatus,
} from "./connection.model";

export interface GitHubConnectionDto {
    id: string;

    status: GitHubConnectionStatus;

    installationId: number | null;

    repository: {
        id: number;
        owner: string;
        name: string;
    } | null;

    createdAt: string;

    connectedAt: string | null;

    revokedAt: string | null;
}

export function toConnectionDto(
    connection: GitHubConnection,
): GitHubConnectionDto {
    const repository =
        connection.repositoryId !== null &&
        connection.repositoryOwner !== null &&
        connection.repositoryName !== null
            ? {
                id: connection.repositoryId,
                owner:
                connection.repositoryOwner,
                name:
                connection.repositoryName,
            }
            : null;

    return {
        id: connection.id,

        status: connection.status,

        installationId:
        connection.installationId,

        repository,

        createdAt:
        connection.createdAt,

        connectedAt:
        connection.connectedAt,

        revokedAt:
        connection.revokedAt,
    };
}