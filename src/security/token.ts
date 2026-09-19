import {
    randomBytes,
    randomUUID,
} from "node:crypto";

export function generateId(): string {
    return randomUUID();
}

export function generateRelayToken(): string {
    return `orb_local_${randomBytes(32).toString("hex")}`;
}

export function generateStateToken(): string {
    return randomBytes(32).toString("hex");
}