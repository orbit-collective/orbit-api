import type {
    GitHubRelayEvent,
    RelayEventAction,
} from "./event.model";

export interface GitHubRelayEventDto {
    id: string;

    type: "pull_request";
    action: RelayEventAction;

    deliveryId: string;

    repository: {
        id: number;
    };

    pullRequest: {
        id: number;
        number: number;
        url: string;
        body: string;
        title: string;
        sourceBranch: string;
        targetBranch: string;
        draft: boolean;
        state: string;
        merged: boolean;
        mergedAt: string | null;
        updatedAt: string;
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

            title:
            event.pullRequestTitle,

            sourceBranch:
            event.pullRequestSourceBranch,

            targetBranch:
            event.pullRequestTargetBranch,

            draft:
            event.pullRequestDraft,

            state:
            event.pullRequestState,

            merged:
            event.pullRequestMerged,

            mergedAt:
            event.pullRequestMergedAt,

            updatedAt:
            event.pullRequestUpdatedAt,
        },

        createdAt:
        event.createdAt,
    };
}