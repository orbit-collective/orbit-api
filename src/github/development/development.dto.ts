export type CiState =
    | "passed"
    | "failed"
    | "pending"
    | "none";

export interface PersonDto {
    login: string;

    avatarUrl: string;
}

export interface CiRunDto {
    name: string;

    state: CiState;

    url: string | null;

    durationSeconds: number | null;
}

export interface CiSummaryDto {
    state: CiState;

    total: number;

    passed: number;

    failed: number;

    pending: number;

    runs: CiRunDto[];
}

export type ReviewState =
    | "approved"
    | "changes_requested"
    | "commented"
    | "none";

export interface PullRequestDto {
    /** GitHub's own numeric id: what Orbit keys a linked pull request by. */
    id: number;

    number: number;

    title: string;

    /** "merged" is derived from merged_at, GitHub itself only says closed. */
    state: "open" | "closed" | "merged";

    draft: boolean;

    url: string;

    body: string;

    author: PersonDto | null;

    headBranch: string;

    headSha: string;

    baseBranch: string;

    labels: Array<{ name: string; color: string }>;

    requestedReviewers: PersonDto[];

    createdAt: string;

    updatedAt: string;

    closedAt: string | null;

    mergedAt: string | null;

    /** Only for open pull requests of a list, computed in a bounded pool. */
    ci: CiSummaryDto | null;
}

export interface PullRequestDetailDto
    extends PullRequestDto {
    additions: number;

    deletions: number;

    changedFiles: number;

    commitCount: number;

    commentCount: number;

    mergeableState: string | null;

    reviewState: ReviewState;

    reviews: Array<{
        author: PersonDto | null;
        state: ReviewState;
        submittedAt: string | null;
    }>;

    commits: CommitDto[];
}

export interface CommitDto {
    sha: string;

    message: string;

    url: string;

    authorName: string;

    author: PersonDto | null;

    committedAt: string | null;
}

export interface BranchDto {
    name: string;

    sha: string;

    protected: boolean;

    isDefault: boolean;
}

export interface InsightsDto {
    repository: {
        fullName: string;
        description: string | null;
        url: string;
        private: boolean;
        defaultBranch: string;
        stars: number;
        forks: number;
        pushedAt: string | null;
    };

    contributors: Array<PersonDto & {
        contributions: number;
        url: string;
    }>;

    languages: Array<{ name: string; bytes: number }>;

    /** Commits per week, oldest first, up to 52 entries. */
    commitActivity: Array<{
        weekStart: string;
        total: number;
    }>;
}

export interface BranchPageDto {
    branches: BranchDto[];

    /** Every branch of the repository (up to a safety cap), not just this page. */
    total: number;

    page: number;

    perPage: number;
}

export interface PullRequestPageDto {
    pullRequests: PullRequestDto[];

    /** Whether the next page may hold more pull requests inside the asked range. */
    hasMore: boolean;
}
