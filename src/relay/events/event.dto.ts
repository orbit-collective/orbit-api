import type {
    GitHubRelayEvent,
} from "./event.model";

export interface GitHubRelayEventDto {
    id: string;

    type: "pull_request";
    action: "opened";

    deliveryId: string;

    repository: {
        id: number;
    };

    pullRequest: {
        id: number;
        number: number;
        url: string;
        body: string;
    };

    createdAt: string;
}

export function toEventDto(
    event: GitHubRelayEvent,
): GitHubRelayEventDto {
    return {
        id:
        event.id,

        type:
        event.type,

        action:
        event.action,

        deliveryId:
        event.deliveryId,

        repository: {
            id:
            event.repositoryId,
        },

        pullRequest: {
            id:
            event.pullRequestId,

            number:
            event.pullRequestNumber,

            url:
            event.pullRequestUrl,

            body:
            event.pullRequestBody,
        },

        createdAt:
        event.createdAt,
    };
}