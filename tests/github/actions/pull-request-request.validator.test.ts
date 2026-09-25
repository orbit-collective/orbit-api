import {
    describe,
    expect,
    it,
} from "vitest";

import {
    validateCreateGitHubPullRequestRequest,
} from "@/github/actions/pull-request-request.validator";

describe("validateCreateGitHubPullRequestRequest", () => {
    it("accepts a valid request and trims whitespace", () => {
        const input = validateCreateGitHubPullRequestRequest({
            repositoryId: 1,
            title: "  Fix login  ",
            head: "  fix/login  ",
            base: "  main  ",
            body: "<!-- orbit-issue:1 -->",
        });

        expect(input).toEqual({
            repositoryId: 1,
            title: "Fix login",
            head: "fix/login",
            base: "main",
            body: "<!-- orbit-issue:1 -->",
        });
    });

    it("defaults body to an empty string when omitted", () => {
        const input = validateCreateGitHubPullRequestRequest({
            repositoryId: 1,
            title: "Fix login",
            head: "fix/login",
            base: "main",
        });

        expect(input.body).toBe("");
    });

    it("rejects a non-object body", () => {
        expect(() => validateCreateGitHubPullRequestRequest(null)).toThrow(
            "Request body must be a JSON object.",
        );
    });

    it("rejects a missing repositoryId", () => {
        expect(() =>
            validateCreateGitHubPullRequestRequest({
                title: "x",
                head: "a",
                base: "b",
            }),
        ).toThrow("repositoryId must be a positive integer.");
    });

    it("rejects an empty title", () => {
        expect(() =>
            validateCreateGitHubPullRequestRequest({
                repositoryId: 1,
                title: "  ",
                head: "a",
                base: "b",
            }),
        ).toThrow("title is required.");
    });

    it("rejects an empty head", () => {
        expect(() =>
            validateCreateGitHubPullRequestRequest({
                repositoryId: 1,
                title: "x",
                head: "",
                base: "b",
            }),
        ).toThrow("head is required.");
    });

    it("rejects an empty base", () => {
        expect(() =>
            validateCreateGitHubPullRequestRequest({
                repositoryId: 1,
                title: "x",
                head: "a",
                base: "",
            }),
        ).toThrow("base is required.");
    });

    it("rejects a title that is too long", () => {
        expect(() =>
            validateCreateGitHubPullRequestRequest({
                repositoryId: 1,
                title: "x".repeat(257),
                head: "a",
                base: "b",
            }),
        ).toThrow("title is too long.");
    });
});
