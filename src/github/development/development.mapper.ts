import type {
    BranchDto,
    CiRunDto,
    CiState,
    CiSummaryDto,
    CommitDto,
    PersonDto,
    PullRequestDetailDto,
    PullRequestDto,
    ReviewState,
} from "./development.dto";

import type {
    GitHubBranchSummary,
    GitHubCheckRun,
    GitHubCheckRunsResponse,
    GitHubCombinedStatus,
    GitHubCommit,
    GitHubPullRequestDetail,
    GitHubPullRequestSummary,
    GitHubReview,
    GitHubUser,
} from "./development.types";

export function toPerson(
    user: GitHubUser | null | undefined,
): PersonDto | null {
    if (!user) {
        return null;
    }

    return {
        login: user.login,
        avatarUrl: user.avatar_url,
    };
}

export function toPullRequest(
    pullRequest: GitHubPullRequestSummary,
    ci: CiSummaryDto | null = null,
): PullRequestDto {
    const merged =
        pullRequest.merged_at !== null;

    return {
        id: pullRequest.id,
        number: pullRequest.number,
        title: pullRequest.title,
        state: merged
            ? "merged"
            : pullRequest.state,
        draft: pullRequest.draft === true,
        url: pullRequest.html_url,
        body: pullRequest.body ?? "",
        author: toPerson(pullRequest.user),
        headBranch: pullRequest.head.ref,
        headSha: pullRequest.head.sha,
        baseBranch: pullRequest.base.ref,
        labels: pullRequest.labels.map(
            (label) => ({
                name: label.name,
                color: label.color,
            }),
        ),
        requestedReviewers: (
            pullRequest.requested_reviewers ?? []
        ).flatMap((reviewer) => {
            const person = toPerson(reviewer);

            return person ? [person] : [];
        }),
        createdAt: pullRequest.created_at,
        updatedAt: pullRequest.updated_at,
        closedAt: pullRequest.closed_at,
        mergedAt: pullRequest.merged_at,
        ci,
    };
}

export function toCommit(
    commit: GitHubCommit,
): CommitDto {
    return {
        sha: commit.sha,
        // Only the subject line: the body is rarely useful in a list.
        message:
            commit.commit.message.split("\n")[0] ?? "",
        url: commit.html_url,
        authorName:
            commit.commit.author?.name ??
            commit.author?.login ??
            "",
        author: toPerson(commit.author),
        committedAt:
            commit.commit.author?.date ?? null,
    };
}

export function toBranch(
    branch: GitHubBranchSummary,
    defaultBranch: string,
): BranchDto {
    return {
        name: branch.name,
        sha: branch.commit.sha,
        protected: branch.protected,
        isDefault: branch.name === defaultBranch,
    };
}

/**
 * GitHub keeps only the latest review of a reviewer relevant: the overall
 * state is changes_requested if any reviewer's latest verdict is that,
 * otherwise approved if any approved, otherwise commented.
 */
export function summariseReviews(
    reviews: GitHubReview[],
): ReviewState {
    const latest = new Map<string, ReviewState>();

    for (const review of reviews) {
        const state = reviewState(review.state);

        if (
            state === "none" ||
            !review.user
        ) {
            continue;
        }

        // A comment never overrides an earlier approval or change request.
        if (
            state === "commented" &&
            latest.has(review.user.login)
        ) {
            continue;
        }

        latest.set(review.user.login, state);
    }

    const states = [...latest.values()];

    if (states.includes("changes_requested")) {
        return "changes_requested";
    }

    if (states.includes("approved")) {
        return "approved";
    }

    return states.includes("commented")
        ? "commented"
        : "none";
}

export function reviewState(
    state: string,
): ReviewState {
    switch (state.toUpperCase()) {
        case "APPROVED":
            return "approved";
        case "CHANGES_REQUESTED":
            return "changes_requested";
        case "COMMENTED":
            return "commented";
        default:
            // PENDING / DISMISSED carry no verdict.
            return "none";
    }
}

export function toPullRequestDetail(
    pullRequest: GitHubPullRequestDetail,
    reviews: GitHubReview[],
    commits: GitHubCommit[],
    ci: CiSummaryDto | null,
): PullRequestDetailDto {
    return {
        ...toPullRequest(pullRequest, ci),
        additions: pullRequest.additions,
        deletions: pullRequest.deletions,
        changedFiles: pullRequest.changed_files,
        commitCount: pullRequest.commits,
        commentCount:
            pullRequest.comments +
            pullRequest.review_comments,
        mergeableState:
            pullRequest.mergeable_state ?? null,
        reviewState: summariseReviews(reviews),
        reviews: reviews.flatMap((review) => {
            const state = reviewState(review.state);

            return state === "none"
                ? []
                : [{
                    author: toPerson(review.user),
                    state,
                    submittedAt:
                        review.submitted_at ?? null,
                }];
        }),
        commits: commits.map(toCommit),
    };
}

function runState(
    run: GitHubCheckRun,
): CiState {
    if (run.status !== "completed") {
        return "pending";
    }

    switch (run.conclusion) {
        case "success":
        case "neutral":
        case "skipped":
            return "passed";
        case "failure":
        case "timed_out":
        case "cancelled":
        case "action_required":
        case "startup_failure":
            return "failed";
        default:
            return "pending";
    }
}

function statusState(
    state: string,
): CiState {
    if (state === "success") {
        return "passed";
    }

    if (
        state === "failure" ||
        state === "error"
    ) {
        return "failed";
    }

    return "pending";
}

function durationSeconds(
    run: GitHubCheckRun,
): number | null {
    if (
        !run.started_at ||
        !run.completed_at
    ) {
        return null;
    }

    const seconds = Math.round(
        (Date.parse(run.completed_at) -
            Date.parse(run.started_at)) /
        1000,
    );

    return Number.isFinite(seconds) && seconds >= 0
        ? seconds
        : null;
}

/**
 * One CI verdict from GitHub Actions/checks runs plus legacy commit
 * statuses: failed if anything failed, pending if anything still runs,
 * passed if there is at least one result and all of them passed, none when
 * the commit has no CI at all.
 */
export function summariseCi(
    checkRuns: GitHubCheckRunsResponse,
    combined: GitHubCombinedStatus,
): CiSummaryDto {
    const runs: CiRunDto[] = [
        ...checkRuns.check_runs.map(
            (run): CiRunDto => ({
                name: run.name,
                state: runState(run),
                url: run.html_url,
                durationSeconds: durationSeconds(run),
            }),
        ),
        ...combined.statuses.map(
            (status): CiRunDto => ({
                name: status.context,
                state: statusState(status.state),
                url: status.target_url,
                durationSeconds: null,
            }),
        ),
    ];

    const count = (state: CiState): number =>
        runs.filter((run) => run.state === state)
            .length;

    const failed = count("failed");
    const pending = count("pending");
    const passed = count("passed");

    return {
        state:
            runs.length === 0
                ? "none"
                : failed > 0
                    ? "failed"
                    : pending > 0
                        ? "pending"
                        : "passed",
        total: runs.length,
        passed,
        failed,
        pending,
        runs,
    };
}
