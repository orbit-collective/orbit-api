import {
    describe,
    expect,
    it,
} from "vitest";

import {
    parseOptionalBranch,
    parsePagination,
    parsePullRequestNumber,
    parsePullRequestState,
    parseRef,
    parseRepositoryId,
    validateUpdatePullRequestRequest,
} from "@/github/development/development-request.validator";

function params(query: string): URLSearchParams {
    return new URLSearchParams(query);
}

describe("query parsing", () => {
    it("reads a repository id and rejects anything else", () => {
        expect(parseRepositoryId(params("repositoryId=12"))).toBe(12);

        for (const query of ["", "repositoryId=0", "repositoryId=x", "repositoryId=1.5"]) {
            expect(() => parseRepositoryId(params(query))).toThrow(
                expect.objectContaining({ code: "INVALID_REPOSITORY_ID" }),
            );
        }
    });

    it("reads an optional pull request number", () => {
        expect(parsePullRequestNumber(params(""))).toBeNull();
        expect(parsePullRequestNumber(params("number=4"))).toBe(4);
        expect(() => parsePullRequestNumber(params("number=-1"))).toThrow(
            expect.objectContaining({ code: "INVALID_PULL_REQUEST_NUMBER" }),
        );
    });

    it("defaults and caps pagination", () => {
        expect(parsePagination(params(""))).toEqual({ page: 1, perPage: 30 });
        expect(parsePagination(params("page=3&perPage=500"))).toEqual({
            page: 3,
            perPage: 100,
        });
        expect(parsePagination(params(""), 10).perPage).toBe(10);
        expect(() => parsePagination(params("page=0"))).toThrow(
            expect.objectContaining({ code: "INVALID_PAGE" }),
        );
        expect(() => parsePagination(params("perPage=a"))).toThrow(
            expect.objectContaining({ code: "INVALID_PER_PAGE" }),
        );
    });

    it("accepts the three pull request states and defaults to open", () => {
        expect(parsePullRequestState(params(""))).toBe("open");
        expect(parsePullRequestState(params("state=all"))).toBe("all");
        expect(() => parsePullRequestState(params("state=merged"))).toThrow(
            expect.objectContaining({ code: "INVALID_PULL_REQUEST_STATE" }),
        );
    });

    it("validates refs", () => {
        expect(parseRef("feat/login-1", "ref")).toBe("feat/login-1");
        expect(parseOptionalBranch(params(""))).toBeUndefined();
        expect(parseOptionalBranch(params("branch=main"))).toBe("main");

        for (const bad of [null, "", "a b", "a..b", "/lead", "x?y"]) {
            expect(() => parseRef(bad, "ref")).toThrow(
                expect.objectContaining({ code: "INVALID_REF" }),
            );
        }
    });
});

describe("validateUpdatePullRequestRequest", () => {
    it("accepts a state change", () => {
        expect(
            validateUpdatePullRequestRequest({
                repositoryId: 1,
                number: 2,
                state: "closed",
            }),
        ).toEqual({ repositoryId: 1, number: 2, state: "closed" });
    });

    it("accepts a title and a body", () => {
        expect(
            validateUpdatePullRequestRequest({
                repositoryId: 1,
                number: 2,
                title: "New",
                body: "",
            }),
        ).toEqual({ repositoryId: 1, number: 2, title: "New", body: "" });
    });

    it.each([
        [null, "INVALID_REQUEST_BODY"],
        [{ number: 1, state: "open" }, "INVALID_REPOSITORY_ID"],
        [{ repositoryId: 1, state: "open" }, "INVALID_PULL_REQUEST_NUMBER"],
        [{ repositoryId: 1, number: 1, state: "merged" }, "INVALID_PULL_REQUEST_STATE"],
        [{ repositoryId: 1, number: 1, title: "  " }, "INVALID_PULL_REQUEST_TITLE"],
        [{ repositoryId: 1, number: 1, title: "x".repeat(257) }, "INVALID_PULL_REQUEST_TITLE"],
        [{ repositoryId: 1, number: 1, body: 5 }, "INVALID_PULL_REQUEST_BODY"],
        [{ repositoryId: 1, number: 1 }, "NOTHING_TO_UPDATE"],
    ])("rejects %j", (body, code) => {
        expect(() => validateUpdatePullRequestRequest(body)).toThrow(
            expect.objectContaining({ code }),
        );
    });
});
