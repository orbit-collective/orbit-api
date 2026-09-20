import type {
    GitHubConnectionDto,
} from "@/relay/connections/connection.dto";

import type {
    GitHubRelayEventDto,
} from "@/relay/events/event.dto";

export interface CreateGitHubConnectionResponse {
    connection:
        GitHubConnectionDto;

    token: string;

    installUrl: string;
}

export interface GetGitHubConnectionResponse
    extends GitHubConnectionDto {}

export interface ListGitHubEventsResponse {
    events:
        GitHubRelayEventDto[];
}

export interface AcknowledgeGitHubEventResponse {
    acknowledged: true;

    eventId: string;
}

export interface CreateGitHubCommentResponse {
    duplicate: boolean;

    comment: {
        id: number;

        url: string;

        author?: string;
    };
}

export interface RotateGitHubConnectionTokenResponse {
    token: string;
}

export interface RevokeGitHubConnectionResponse {
    revoked: true;
}