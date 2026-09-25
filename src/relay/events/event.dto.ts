import type {
    GitHubCheckStatus,
    GitHubRelayEvent,
    GitHubReviewState,
    RelayEventAction,
    RelayEventType,
} from "./event.model";

export interface GitHubRelayEventDto {
    id: string;

    type: RelayEventType;
    action: RelayEventAction;

    deliveryId: string;

    repository: {
        id: number;
    };

    pullRequestId: number;
    pullRequestNumber: number;

    /** Only present for `type: "pull_request"`. */
    pullRequest?: {
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

    /** Only present for `type: "check_suite"`. */
    check?: {
        status: GitHubCheckStatus;
    };

    /** Only present for `type: "pull_request_review"`. */
    review?: {
        state: GitHubReviewState;
        reviewerLogin: string;
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

        pullRequestId:
        event.pullRequestId,

        pullRequestNumber:
        event.pullRequestNumber,

        ...(event.type ===
            "pull_request" && {
            pullRequest: {
                url:
                event.pullRequestUrl as string,

                body:
                event.pullRequestBody as string,

                title:
                event.pullRequestTitle as string,

                sourceBranch:
                event.pullRequestSourceBranch as string,

                targetBranch:
                event.pullRequestTargetBranch as string,

                draft:
                event.pullRequestDraft as boolean,

                state:
                event.pullRequestState as string,

                merged:
                event.pullRequestMerged as boolean,

                mergedAt:
                event.pullRequestMergedAt ??
                null,

                updatedAt:
                event.pullRequestUpdatedAt as string,
            },
        }),

        ...(event.type ===
            "check_suite" &&
            event.checkStatus !==
            undefined && {
            check: {
                status:
                event.checkStatus,
            },
        }),

        ...(event.type ===
            "pull_request_review" &&
            event.reviewState !==
            undefined && {
            review: {
                state:
                event.reviewState,

                reviewerLogin:
                event.reviewerLogin as string,
            },
        }),

        createdAt:
        event.createdAt,
    };
}
