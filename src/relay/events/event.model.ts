export type RelayEventType =
    | "pull_request"
    | "check_suite"
    | "pull_request_review";

export type RelayEventAction =
    | "opened"
    | "reopened"
    | "closed"
    | "synchronize"
    | "completed"
    | "submitted";

export type GitHubCheckStatus =
    | "pending"
    | "passed"
    | "failed";

export type GitHubReviewState =
    | "approved"
    | "changes_requested"
    | "commented";

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

    /**
     * The fields below are only ever populated for `type: "pull_request"` -
     * a check_suite/pull_request_review event only needs the PR identity
     * above to resolve which existing link it applies to (see
     * GithubRelayEventProcessor.handleCheckSuite()/handleReviewSubmitted()
     * on the Orbit Local side), never a full copy of the PR's own metadata.
     */
    pullRequestUrl?: string;

    pullRequestBody?: string;

    pullRequestTitle?: string;

    pullRequestSourceBranch?: string;

    pullRequestTargetBranch?: string;

    pullRequestDraft?: boolean;

    pullRequestState?: string;

    pullRequestMerged?: boolean;

    pullRequestMergedAt?: string | null;

    pullRequestUpdatedAt?: string;

    /** Only for `type: "check_suite"` - GitHub's own conclusion, reduced to three states (see GithubRelayEventProcessor for the mapping). */
    checkStatus?: GitHubCheckStatus;

    /** Only for `type: "pull_request_review"`. */
    reviewState?: GitHubReviewState;

    reviewerLogin?: string;

    createdAt: string;

    processedAt: string | null;

    expiresAt: string;
}
