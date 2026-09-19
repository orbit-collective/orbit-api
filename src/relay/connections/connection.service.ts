import {
    createGitHubInstallationUrl,
} from "@/github/installations/github-installation-url";

import {
    createConnection,
} from "./connection.factory";

import {
    ConnectionRepository,
} from "./connection.repository";

import {
    toConnectionDto,
    type GitHubConnectionDto,
} from "./connection.dto";

export interface CreateConnectionResult {
    connection:
        GitHubConnectionDto;

    token: string;

    installUrl: string;
}

export class ConnectionService {
    public constructor(
        private readonly repository =
        new ConnectionRepository(),
    ) {}

    public async create():
        Promise<CreateConnectionResult> {
        const {
            connection,
            token,
            state,
        } = createConnection();

        await this.repository.create(
            connection,
        );

        const installUrl =
            createGitHubInstallationUrl(
                state,
            );

        return {
            connection:
                toConnectionDto(
                    connection,
                ),

            token,

            installUrl,
        };
    }
}