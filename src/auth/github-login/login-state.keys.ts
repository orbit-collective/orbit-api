export const loginStateKeys = {
    byStateHash(stateHash: string): string {
        return `login-state/${stateHash}`;
    },
};
