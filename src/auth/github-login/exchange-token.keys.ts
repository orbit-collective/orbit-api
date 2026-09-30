export const exchangeTokenKeys = {
    byTokenHash(tokenHash: string): string {
        return `login-exchange-token/${tokenHash}`;
    },
};
