import { getOrbitStore } from "@/shared/storage";

import { exchangeTokenKeys } from "./exchange-token.keys";
import type { GitHubExchangeToken } from "./exchange-token.model";

export class ExchangeTokenRepository {
    public async create(
        tokenHash: string,
        token: GitHubExchangeToken,
    ): Promise<void> {
        const store = getOrbitStore();

        const result = await store.setJSON(
            exchangeTokenKeys.byTokenHash(tokenHash),
            token,
            {
                onlyIfNew: true,
            },
        );

        if (!result.modified) {
            throw new Error(
                `Exchange token ${tokenHash} already exists.`,
            );
        }
    }

    /**
     * Reads and immediately deletes the token, so a leaked/replayed
     * exchange_token can only ever be redeemed once.
     */
    public async consume(
        tokenHash: string,
    ): Promise<GitHubExchangeToken | null> {
        const store = getOrbitStore();

        const token = await store.get(
            exchangeTokenKeys.byTokenHash(tokenHash),
            {
                type: "json",
                consistency: "strong",
            },
        ) as GitHubExchangeToken | null;

        if (!token) {
            return null;
        }

        await store.delete(
            exchangeTokenKeys.byTokenHash(tokenHash),
        );

        return token;
    }
}
