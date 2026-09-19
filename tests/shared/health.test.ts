import { describe, expect, it } from "vitest";

import { getHealthStatus } from "@/shared/health";

describe("getHealthStatus", () => {
    it("returns healthy Orbit API status", () => {
        const result = getHealthStatus();

        expect(result.status).toBe("ok");
        expect(result.service).toBe("orbit-api");

        expect(
            Number.isNaN(Date.parse(result.timestamp)),
        ).toBe(false);
    });
});