export const repositoryKeys = {
    byConnection(
        connectionId: string,
        repositoryId: number,
    ): string {
        return `connection-repositories/${connectionId}/${repositoryId}`;
    },

    prefix(
        connectionId: string,
    ): string {
        return `connection-repositories/${connectionId}/`;
    },
};
