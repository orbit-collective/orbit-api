export type RelayEventType =
    | "pull_request";

export type RelayEventAction =
    | "opened";

export interface GitHubRelayEvent {
    id: string;

    connectionId: string;

    deliveryId: string;

    type: RelayEventType;

    action: RelayEventAction;

    installationId: number;

    repositoryId: number;

    pullRequestId: number;

    pullRequestNumber: number;

    pullRequestUrl: string;

    pullRequestBody: string;

    createdAt: string;

    processedAt: string | null;
}