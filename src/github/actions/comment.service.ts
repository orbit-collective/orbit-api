import {
    generateId,
} from "@/security/token";

import {
    now,
} from "@/shared/time";

import {
    ApiError,
} from "@/shared/errors";

import {
    InstallationTokenService,
} from "@/github/app-auth/installation-token.service";

import {
    EventRepository,
} from "@/relay/events/event.repository";

import type {
    GitHubConnection,
} from "@/relay/connections/connection.model";

import {
    CommentRepository,
} from "./comment.repository";

import {
    GitHubCommentClient,
} from "./github-comment.client";

import type {
    CreateGitHubCommentRequest,
} from "./comment-request.model";

export class CommentService {
    public constructor(
        private readonly eventRepository =
        new EventRepository(),

        private readonly commentRepository =
        new CommentRepository(),

        private readonly installationTokenService =
        new InstallationTokenService(),

        private readonly githubCommentClient =
        new GitHubCommentClient(),
    ) {}

    public async create(
        connection: GitHubConnection,
        input: CreateGitHubCommentRequest,
    ) {
        if (
            connection.status !==
            "connected"
        ) {
            throw new ApiError(
                "CONNECTION_NOT_CONNECTED",
                "GitHub connection is not connected.",
                409,
            );
        }

        if (
            connection.installationId ===
            null ||
            connection.repositoryId ===
            null ||
            connection.repositoryOwner ===
            null ||
            connection.repositoryName ===
            null
        ) {
            throw new ApiError(
                "INCOMPLETE_CONNECTION",
                "GitHub connection is incomplete.",
                409,
            );
        }

        const event =
            await this.eventRepository
                .findById(
                    connection.id,
                    input.eventId,
                );

        if (!event) {
            throw new ApiError(
                "EVENT_NOT_FOUND",
                "Relay event could not be found.",
                404,
            );
        }

        if (
            event.repositoryId !==
            connection.repositoryId
        ) {
            throw new ApiError(
                "EVENT_REPOSITORY_MISMATCH",
                "Relay event does not belong to the connected repository.",
                403,
            );
        }

        if (
            event.pullRequestNumber !==
            input.pullRequestNumber
        ) {
            throw new ApiError(
                "PULL_REQUEST_MISMATCH",
                "Pull request number does not match the relay event.",
                400,
            );
        }

        const existing =
            await this.commentRepository
                .findByEvent(
                    connection.id,
                    input.eventId,
                );

        if (existing) {
            return {
                duplicate:
                    true,

                comment: {
                    id:
                    existing
                        .githubCommentId,

                    url:
                    existing
                        .githubCommentUrl,
                },
            };
        }

        const installationToken =
            await this
                .installationTokenService
                .create(
                    connection
                        .installationId,
                );

        const comment =
            await this
                .githubCommentClient
                .create(
                    installationToken
                        .token,

                    connection
                        .repositoryOwner,

                    connection
                        .repositoryName,

                    input
                        .pullRequestNumber,

                    input.body,
                );

        const created =
            await this
                .commentRepository
                .create({
                    id:
                        generateId(),

                    connectionId:
                    connection.id,

                    eventId:
                    event.id,

                    deliveryId:
                    event.deliveryId,

                    repositoryId:
                    event.repositoryId,

                    pullRequestNumber:
                    event
                        .pullRequestNumber,

                    githubCommentId:
                    comment.id,

                    githubCommentUrl:
                    comment
                        .html_url,

                    createdAt:
                        now(),
                });

        if (!created) {
            /*
             * Extremely unlikely race:
             * two requests passed the initial
             * duplicate check simultaneously.
             */
            const stored =
                await this
                    .commentRepository
                    .findByEvent(
                        connection.id,
                        event.id,
                    );

            return {
                duplicate:
                    true,

                comment:
                    stored
                        ? {
                            id:
                            stored
                                .githubCommentId,

                            url:
                            stored
                                .githubCommentUrl,
                        }
                        : {
                            id:
                            comment.id,

                            url:
                            comment
                                .html_url,
                        },
            };
        }

        return {
            duplicate:
                false,

            comment: {
                id:
                comment.id,

                url:
                comment.html_url,

                author:
                comment.user
                    .login,
            },
        };
    }
}