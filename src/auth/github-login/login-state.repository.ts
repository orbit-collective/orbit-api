import { getOrbitStore } from "@/shared/storage";

import { loginStateKeys } from "./login-state.keys";
import type { GitHubLoginState } from "./login-state.model";

export class LoginStateRepository {
    public async create(
        stateHash: string,
        state: GitHubLoginState,
    ): Promise<void> {
        const store = getOrbitStore();

        const result = await store.setJSON(
            loginStateKeys.byStateHash(stateHash),
            state,
            {
                onlyIfNew: true,
            },
        );

        if (!result.modified) {
            throw new Error(
                `Login state ${stateHash} already exists.`,
            );
        }
    }

    public async findByStateHash(
        stateHash: string,
    ): Promise<GitHubLoginState | null> {
        const store = getOrbitStore();

        return await store.get(
            loginStateKeys.byStateHash(stateHash),
            {
                type: "json",
                consistency: "strong",
            },
        ) as GitHubLoginState | null;
    }

    public async remove(
        stateHash: string,
    ): Promise<void> {
        const store = getOrbitStore();

        await store.delete(
            loginStateKeys.byStateHash(stateHash),
        );
    }
}
