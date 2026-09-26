import { failure } from "./http.js";

export class ApiError extends Error {
    public readonly code: string;
    public readonly status: number;

    /**
     * The raw GitHub API response status, when this error originates from a
     * failed GitHub API call (see githubRequest()) - lets a caller like
     * BranchService distinguish e.g. a 422 "reference already exists" from
     * any other GitHub failure without githubRequest itself having to know
     * about every domain-specific error code callers might want.
     */
    public readonly githubStatus?: number;

    /**
     * GitHub's own top-level `message` from a failed response body (e.g.
     * "Validation Failed", "No commits between master and my-branch") - safe
     * to surface to an end user (GitHub itself returns it in a public API
     * response), unlike the full response body, which is only ever logged
     * server-side.
     */
    public readonly githubMessage?: string;

    public constructor(
        code: string,
        message: string,
        status = 400,
        githubStatus?: number,
        githubMessage?: string,
    ) {
        super(message);

        this.name = "ApiError";
        this.code = code;
        this.status = status;

        if (githubStatus !== undefined) {
            this.githubStatus = githubStatus;
        }

        if (githubMessage !== undefined) {
            this.githubMessage = githubMessage;
        }
    }
}

export async function handleRequest(
    callback: () => Promise<Response>,
): Promise<Response> {
    try {
        return await callback();
    } catch (error) {
        if (error instanceof ApiError) {
            return failure(
                error.code,
                error.message,
                error.status,
            );
        }

        console.error("Unhandled API error:", error);

        return failure(
            "INTERNAL_SERVER_ERROR",
            "An unexpected error occurred.",
            500,
        );
    }
}