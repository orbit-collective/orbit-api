import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

const authenticate = vi.hoisted(() => vi.fn());

vi.mock("@/relay/auth/connection-auth", () => ({
    ConnectionAuthenticator: class {
        authenticate = authenticate;
    },
}));

const { handleAuthenticated } = await import(
    "@/github/development/development-handler"
);

beforeEach(() => {
    authenticate.mockReset().mockResolvedValue({ id: "c" });
});

describe("handleAuthenticated", () => {
    it("answers 405 with the allowed method and never authenticates", async () => {
        const response = await handleAuthenticated(
            new Request("https://x.test/", { method: "POST" }),
            "GET",
            async () => ({}),
        );

        expect(response.status).toBe(405);
        expect(response.headers.get("Allow")).toBe("GET");
        expect(authenticate).not.toHaveBeenCalled();
    });

    it("wraps the work's result in the success envelope", async () => {
        const response = await handleAuthenticated(
            new Request("https://x.test/"),
            "GET",
            async (connection) => ({ seen: connection }),
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            success: true,
            data: { seen: { id: "c" } },
        });
    });

    it("turns an ApiError into a failure envelope", async () => {
        const { ApiError } = await import("@/shared/errors");

        const response = await handleAuthenticated(
            new Request("https://x.test/"),
            "GET",
            async () => {
                throw new ApiError("NOPE", "No.", 403);
            },
        );

        expect(response.status).toBe(403);
        expect(await response.json()).toMatchObject({
            success: false,
            error: { code: "NOPE" },
        });
    });
});
