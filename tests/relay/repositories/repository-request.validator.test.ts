import {
    describe,
    expect,
    it,
} from "vitest";

import {
    validateAddGitHubRepositoryRequest,
} from "@/relay/repositories/repository-request.validator";

describe("validateAddGitHubRepositoryRequest", () => {
    it("accepts a positive integer repositoryId", () => {
        expect(
            validateAddGitHubRepositoryRequest({ repositoryId: 456 }),
        ).toEqual({ repositoryId: 456 });
    });

    it("rejects a non-object body", () => {
        expect(() =>
            validateAddGitHubRepositoryRequest("nope"),
        ).toThrow("Request body must be a JSON object.");
    });

    it("rejects a missing repositoryId", () => {
        expect(() =>
            validateAddGitHubRepositoryRequest({}),
        ).toThrow("repositoryId must be a positive integer.");
    });

    it("rejects a non-integer repositoryId", () => {
        expect(() =>
            validateAddGitHubRepositoryRequest({ repositoryId: 1.5 }),
        ).toThrow("repositoryId must be a positive integer.");
    });

    it("rejects a non-positive repositoryId", () => {
        expect(() =>
            validateAddGitHubRepositoryRequest({ repositoryId: 0 }),
        ).toThrow("repositoryId must be a positive integer.");
    });
});
