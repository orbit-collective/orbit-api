import {
    ApiError,
} from "@/shared/errors";

import {
    githubRequest,
} from "@/github/app-auth/github-api";

interface GitHubContentsResponse {
    content: string;

    encoding: string;
}

/**
 * The well-known paths GitHub itself checks for a repository's default pull
 * request template, in the same precedence GitHub's own UI uses. A
 * `PULL_REQUEST_TEMPLATE/` directory of multiple named templates is
 * deliberately not supported here - picking one requires a query param a
 * caller would have to already know about, which is out of scope for this
 * minimal lookup.
 */
const TEMPLATE_PATHS = [
    ".github/pull_request_template.md",
    ".github/PULL_REQUEST_TEMPLATE.md",
    "docs/pull_request_template.md",
    "docs/PULL_REQUEST_TEMPLATE.md",
    "pull_request_template.md",
    "PULL_REQUEST_TEMPLATE.md",
];

export class GitHubPullRequestTemplateClient {
    /**
     * @returns the decoded template content, or null if the repository has
     *            none of the well-known template files.
     */
    public async find(
        token: string,
        owner: string,
        repository: string,
    ): Promise<string | null> {
        for (const path of TEMPLATE_PATHS) {
            try {
                const file =
                    await githubRequest<
                        GitHubContentsResponse
                    >(
                        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/contents/${path}`,
                        {
                            token,
                        },
                    );

                if (
                    file.encoding ===
                    "base64"
                ) {
                    return Buffer.from(
                        file.content,
                        "base64",
                    ).toString(
                        "utf-8",
                    );
                }
            } catch (error) {
                if (
                    error instanceof
                    ApiError &&
                    error.githubStatus ===
                    404
                ) {
                    continue;
                }

                throw error;
            }
        }

        return null;
    }
}
