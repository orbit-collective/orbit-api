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
    connection: GitHubConnectionDto;

    /**
     * Plaintext relay token.
     *
     * Returned exactly once to Orbit Local.
     */
    token: string;

    /**
     * Temporary installation state.
     *
     * This will be replaced by an installation URL
     * once GitHub App configuration is implemented.
     */
    state: string;
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

        return {
            connection:
                toConnectionDto(
                    connection,
                ),

            token,
            state,
        };
    }
}