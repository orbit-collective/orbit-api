import {
    describe,
    expect,
    it,
} from "vitest";

import {
    validateCreateGitHubBranchRequest,
} from "@/github/actions/branch-request.validator";

describe("validateCreateGitHubBranchRequest", () => {
    it("accepts a minimal valid request", () => {
        const input = validateCreateGitHubBranchRequest({
            repositoryId: 1,
            name: "1234-fix-login",
        });

        expect(input).toEqual({
            repositoryId: 1,
            name: "1234-fix-login",
            baseBranch: undefined,
        });
    });

    it("accepts an optional baseBranch", () => {
        const input = validateCreateGitHubBranchRequest({
            repositoryId: 1,
            name: "1234-fix-login",
            baseBranch: "develop",
        });

        expect(input.baseBranch).toBe("develop");
    });

    it("rejects a non-object body", () => {
        expect(() => validateCreateGitHubBranchRequest(null)).toThrow(
            "Request body must be a JSON object.",
        );
    });

    it("rejects a missing or invalid repositoryId", () => {
        expect(() =>
            validateCreateGitHubBranchRequest({ name: "x" }),
        ).toThrow("repositoryId must be a positive integer.");

        expect(() =>
            validateCreateGitHubBranchRequest({ repositoryId: -1, name: "x" }),
        ).toThrow("repositoryId must be a positive integer.");
    });

    it("rejects a branch name with a space", () => {
        expect(() =>
            validateCreateGitHubBranchRequest({
                repositoryId: 1,
                name: "fix login",
            }),
        ).toThrow("name must be a valid git branch name.");
    });

    it("rejects a branch name containing '..'", () => {
        expect(() =>
            validateCreateGitHubBranchRequest({
                repositoryId: 1,
                name: "fix..login",
            }),
        ).toThrow("name must be a valid git branch name.");
    });

    it("rejects a branch name starting with a slash", () => {
        expect(() =>
            validateCreateGitHubBranchRequest({
                repositoryId: 1,
                name: "/fix-login",
            }),
        ).toThrow("name must be a valid git branch name.");
    });

    it("rejects an empty baseBranch", () => {
        expect(() =>
            validateCreateGitHubBranchRequest({
                repositoryId: 1,
                name: "fix-login",
                baseBranch: "  ",
            }),
        ).toThrow("baseBranch must be a non-empty string when provided.");
    });
});
