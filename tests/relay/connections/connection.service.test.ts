import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

const mocks =
    vi.hoisted(
        () => ({
            createGitHubInstallationUrl:
                vi.fn(),
        }),
    );

vi.mock(
    "@/github/installations/github-installation-url",
    () => ({
        createGitHubInstallationUrl:
            mocks
                .createGitHubInstallationUrl,
    }),
);

const {
    ConnectionService,
} = await import(
    "@/relay/connections/connection.service"
    );

beforeEach(
    () => {
        mocks
            .createGitHubInstallationUrl
            .mockReset()
            .mockReturnValue(
                "https://github.com/apps/orbit/installations/new?state=state",
            );
    },
);

describe(
    "ConnectionService",
    () => {
        it(
            "creates a pending connection with a relay token and install url",
            async () => {
                const repository = {
                    create:
                        vi.fn()
                            .mockResolvedValue(
                                undefined,
                            ),
                };

                const result =
                    await new ConnectionService(
                        repository as never,
                    ).create();

                expect(
                    repository.create,
                ).toHaveBeenCalledTimes(
                    1,
                );

                const [
                    stored,
                ] = repository.create
                    .mock.calls[0]!;

                expect(
                    stored.status,
                ).toBe("pending");

                expect(
                    result.connection
                        .id,
                ).toBe(stored.id);

                expect(
                    result.token
                        .startsWith(
                            "orb_",
                        ),
                ).toBe(true);

                expect(
                    result.installUrl,
                ).toBe(
                    "https://github.com/apps/orbit/installations/new?state=state",
                );

                expect(
                    result.connection,
                ).not
                    .toHaveProperty(
                        "tokenHash",
                    );
            },
        );
    },
);
