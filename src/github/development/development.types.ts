/** The subset of GitHub's REST payloads the development panel reads. */

export interface GitHubUser {
    login: string;

    avatar_url: string;

    html_url?: string;
}

export interface GitHubLabel {
    name: string;

    color: string;
}

export interface GitHubPullRequestSummary {
    id: number;

    number: number;

    title: string;

    state: "open" | "closed";

    draft?: boolean;

    merged_at: string | null;

    html_url: string;

    body: string | null;

    user: GitHubUser | null;

    head: {
        ref: string;

        sha: string;
    };

    base: {
        ref: string;
    };

    labels: GitHubLabel[];

    requested_reviewers?: GitHubUser[];

    created_at: string;

    updated_at: string;

    closed_at: string | null;
}

export interface GitHubPullRequestDetail
    extends GitHubPullRequestSummary {
    additions: number;

    deletions: number;

    changed_files: number;

    commits: number;

    comments: number;

    review_comments: number;

    mergeable_state?: string;
}

export interface GitHubReview {
    user: GitHubUser | null;

    state: string;

    submitted_at?: string;
}

export interface GitHubCommit {
    sha: string;

    html_url: string;

    commit: {
        message: string;

        author: {
            name: string;

            date: string;
        } | null;
    };

    author: GitHubUser | null;
}

export interface GitHubCheckRun {
    name: string;

    status: string;

    conclusion: string | null;

    html_url: string | null;

    started_at: string | null;

    completed_at: string | null;
}

export interface GitHubCheckRunsResponse {
    total_count: number;

    check_runs: GitHubCheckRun[];
}

export interface GitHubCombinedStatus {
    state: string;

    statuses: Array<{
        context: string;

        state: string;

        target_url: string | null;

        description: string | null;
    }>;
}

export interface GitHubBranchSummary {
    name: string;

    protected: boolean;

    commit: {
        sha: string;
    };
}

export interface GitHubContributor {
    login: string;

    avatar_url: string;

    html_url: string;

    contributions: number;
}

export interface GitHubCommitActivityWeek {
    week: number;

    total: number;

    days: number[];
}

export interface GitHubRepositoryDetails {
    full_name: string;

    description: string | null;

    html_url: string;

    private: boolean;

    default_branch: string;

    stargazers_count: number;

    forks_count: number;

    open_issues_count: number;

    pushed_at: string | null;
}

/** An item of GitHub's issues list: pull requests show up there too, marked by `pull_request`. */
export interface GitHubIssue {
    id: number;

    number: number;

    title: string;

    state: "open" | "closed";

    html_url: string;

    body: string | null;

    user: GitHubUser | null;

    labels: Array<GitHubLabel | string>;

    assignees?: GitHubUser[];

    comments: number;

    created_at: string;

    updated_at: string;

    closed_at: string | null;

    pull_request?: unknown;
}

export interface GitHubMergeResult {
    merged: boolean;

    message: string;

    sha: string;
}
