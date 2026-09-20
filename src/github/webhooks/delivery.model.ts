export type GitHubWebhookDeliveryStatus =
    | "received"
    | "processing"
    | "processed"
    | "failed";

export interface GitHubWebhookDelivery {
    id: string;

    event: string;

    action: string | null;

    status: GitHubWebhookDeliveryStatus;

    receivedAt: string;

    processingStartedAt: string | null;

    processedAt: string | null;

    failedAt: string | null;

    attempts: number;

    lastError: string | null;
}