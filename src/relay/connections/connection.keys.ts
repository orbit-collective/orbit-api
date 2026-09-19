export const connectionKeys = {
    byId(connectionId: string): string {
        return `connections/${connectionId}`;
    },

    byTokenHash(tokenHash: string): string {
        return `connection-token/${tokenHash}`;
    },

    byRepository(
        installationId: number,
        repositoryId: number,
    ): string {
        return `connection-repository/${installationId}/${repositoryId}`;
    },
};