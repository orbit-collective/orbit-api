import { getStore } from "@netlify/blobs";

const STORE_NAME = "orbit-api";

export function getOrbitStore() {
    return getStore({
        name: STORE_NAME,
        consistency: "strong",
    });
}