export interface GitHubWebhookDelivery {
    id: string;

    event: string;

    action: string | null;

    receivedAt: string;

    processedAt: string | null;
}