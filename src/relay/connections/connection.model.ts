export type GitHubConnectionStatus =
    | "pending"
    | "connected"
    | "revoked";

export interface GitHubConnection {
    id: string;

    status: GitHubConnectionStatus;

    tokenHash: string;

    stateHash: string;

    stateExpiresAt: string;

    installationId: number | null;

    repositoryId: number | null;

    repositoryOwner: string | null;

    repositoryName: string | null;

    createdAt: string;

    connectedAt: string | null;

    revokedAt: string | null;
}