import { now } from "./time.js";

export interface HealthStatus {
    status: "ok";
    service: "orbit-api";
    version: string;
    timestamp: string;
}

export function getHealthStatus(): HealthStatus {
    return {
        status: "ok",
        service: "orbit-api",
        version: process.env.APP_VERSION ?? "unknown",
        timestamp: now(),
    };
}