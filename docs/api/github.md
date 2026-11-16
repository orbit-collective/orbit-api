# GitHub Integration API

Base URL:
https://api.orbit-dev.app/v1/github

## Authentication

Endpoints used by Orbit Local require:

Authorization: `Bearer orb_local_<token>`

The plaintext relay token is returned only when a connection is created or rotated.

### Create connection
**POST /connections**

Response:

``` ts
{
  "success": true,
  "data": {
    "connection": {
      "id": "uuid",
      "status": "pending",
      "installationId": null,
      "repository": null,
      "createdAt": "ISO-8601",
      "connectedAt": null,
      "revokedAt": null
    },
    "token": "orb_local_...",
    "installUrl": "https://github.com/apps/..."
  }
}
```

### Get current connection
`GET /connections/me
Authorization: Bearer <token>`

### Rotate relay token
`POST /connections/token/rotate
Authorization: Bearer <token>`

The previous token becomes invalid immediately.

### Revoke connection
`POST /connections/revoke
Authorization: Bearer <token>`

### List pending GitHub events
`GET /events
Authorization: Bearer <token>`

Response:

```ts
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "uuid",
        "type": "pull_request",
        "action": "opened",
        "deliveryId": "github-delivery-id",
        "repository": {
          "id": 1274545725
        },
        "pullRequest": {
          "id": 4580098240,
          "number": 283,
          "url": "https://github.com/...",
          "body": "<!-- orbit-issue:213769 -->"
        },
        "createdAt": "ISO-8601"
      }
    ]
  }
}
```

### Acknowledge event
`POST /events/{eventId}/ack
Authorization: Bearer <token>`

ACK is idempotent.
Only acknowledge an event after Orbit Local has successfully completed processing.

### Create pull request comment
`POST /comments
Authorization: Bearer <token>
Content-Type: application/json`

Request:

```ts 
{
  "eventId": "uuid",
  "pullRequestNumber": 283,
  "body": "Synced with Orbit..."
}
```

The repository and GitHub installation are derived from the authenticated connection and cannot be supplied by the caller.

Pull request linking metadata

## The only supported MVP format is:

<!-- orbit-issue:213769 -->

**Rules:**

- no marker: ignore the PR;
- exactly one marker: resolve the issue;
- more than one marker: treat the PR as ambiguous;
- no branch-name fallback;
- no PR-title fallback;
- no commit-message fallback;
- no fuzzy or AI matching.

**Event lifecycle:**
GitHub webhook
→ relay event created
→ Orbit Local fetches event
→ Local processes event
→ Local creates orbit[bot] comment
→ Local ACKs event

Relay events expire after 24 hours. Expired events are no longer returned
and are deleted lazily, a bounded batch at a time, whenever the connection
lists its pending events; acknowledging an event that has already been
deleted therefore returns `EVENT_NOT_FOUND` instead of `EVENT_EXPIRED`.

## Development panel endpoints

Read models behind the Development view of a project in Orbit. All of them
require `Authorization: Bearer <token>`, take the repository as
`repositoryId` (it must be one of the connection's own repositories,
otherwise `GITHUB_REPOSITORY_NOT_ALLOWED`) and answer in the usual
`{ success, data }` envelope. GitHub's own payloads never leave orbit-api,
only the shapes below do. A pull request's `state` is `open`, `closed` or
`merged` (derived from `merged_at`).

### List pull requests
`GET /pull-requests?repositoryId=1&state=open|closed|all&page=1&perPage=100&since=2026-08-01&ci=none`

```ts
{ "pullRequests": PullRequest[], "hasMore": boolean }
```

Newest update first. `since` (an ISO date) keeps only what was updated since
then, and `hasMore` says whether the next page can still hold more inside the
range, so a client can read a time window page by page. Without
`ci=none`, open pull requests carry `ci` (see Checks), looked up for at most
the first 20 open ones of the page (two GitHub calls each, so slow); it is
`null` for the rest and whenever the lookup failed. Ask for the CI of what is
shown with `GET /checks?refs=` instead.

### Get one pull request
`GET /pull-requests?repositoryId=1&number=7`

A `PullRequest` (with GitHub's numeric `id`, which is what Orbit keys links by) plus `additions`, `deletions`, `changedFiles`,
`commitCount`, `commentCount`, `mergeableState`, `reviewState`
(`approved` | `changes_requested` | `commented` | `none`), `reviews[]` and
`commits[]`.

### Update a pull request
`POST /pull-request-update`

```ts
{ "repositoryId": 1, "number": 7, "state"?: "open" | "closed", "title"?: string, "body"?: string }
```

At least one of `state`, `title`, `body`. Closing never merges. Orbit uses
`body` to add or drop `<!-- orbit-issue:ID -->` markers. GitHub's own
validation message is returned as `GITHUB_PULL_REQUEST_REJECTED`.

### List issues
`GET /issues?repositoryId=1&state=open|closed|all&page=1&perPage=30&since=2026-08-01`

```ts
{ "issues": [{ "id", "number", "title", "state", "url", "author": Person | null,
               "labels": [{ "name", "color" }], "assignees": Person[],
               "commentCount", "createdAt", "updatedAt", "closedAt" }],
  "hasMore": boolean }
```

GitHub issues of the repository (its pull requests are left out), newest
update first. GitHub's list mixes issues and pull requests, so a page may hold
fewer issues than `perPage`; `hasMore` follows GitHub's own page.

### List commits
`GET /commits?repositoryId=1&branch=main&page=1&perPage=30`

```ts
{ "commits": [{ "sha", "message", "url", "authorName", "author": Person | null, "committedAt" }] }
```

`message` is the subject line only; `branch` is optional (default branch).

### List branches
`GET /branches?repositoryId=1&page=1&perPage=10`

```ts
{ "branches": [{ "name", "sha", "protected", "isDefault" }],
  "total": 134, "page": 1, "perPage": 10 }
```

The default branch comes first. GitHub lists branches alphabetically and a
hundred at a time, so orbit-api reads every page (up to 1000 branches),
sorts and cuts the requested page; `total` is the real count. `perPage` is
at most 100.

### Checks (CI)
`GET /checks?repositoryId=1&ref=<branch-or-sha>`

```ts
{ "state": "passed" | "failed" | "pending" | "none", "total", "passed", "failed", "pending",
  "runs": [{ "name", "state", "url", "durationSeconds" }] }
```

Combines check runs and legacy commit statuses: `failed` if anything failed,
`pending` if anything still runs, `passed` if all passed, `none` without CI.

`GET /checks?repositoryId=1&refs=sha1,sha2` (at most 20) answers
`{ "checks": { "sha1": Checks | null, ... } }`: one call for the pull
requests on screen, a ref whose lookup failed is `null`.

### Insights
`GET /insights?repositoryId=1`

```ts
{ "repository": { "fullName", "description", "url", "private", "defaultBranch", "stars", "forks", "pushedAt" },
  "contributors": [{ "login", "avatarUrl", "contributions", "url" }],
  "languages": [{ "name", "bytes" }],
  "commitActivity": [{ "weekStart": "YYYY-MM-DD", "total": 4 }] }
```

The three statistics are best-effort: GitHub computes commit activity on the
first request, so they may be empty until a later call.

### Error format
```ts
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message."
  }
}
```

## Error codes

Stable error codes currently used by the GitHub API:

| Code | Meaning |
|---|---|
| `AUTHORIZATION_REQUIRED` | Authorization header was not supplied. |
| `INVALID_AUTHORIZATION` | Authorization header is malformed. |
| `INVALID_RELAY_TOKEN` | Relay token is unknown or invalid. |
| `CONNECTION_REVOKED` | Connection has been revoked. |
| `INVALID_CONNECTION_STATE` | Installation state is invalid or already consumed. |
| `CONNECTION_STATE_EXPIRED` | Installation state expired before callback. |
| `CONNECTION_NOT_CONNECTED` | Action requires an active GitHub connection. |
| `EVENT_NOT_FOUND` | Relay event does not exist for the authenticated connection. |
| `EVENT_EXPIRED` | Relay event exceeded its retention period. |
| `PULL_REQUEST_MISMATCH` | PR number does not match the relay event. |
| `INVALID_GITHUB_SIGNATURE` | Webhook HMAC verification failed. |
| `INVALID_WEBHOOK_PAYLOAD` | Webhook body is not valid JSON. |
| `GITHUB_API_ERROR` | An upstream GitHub API request failed. |
| `GITHUB_REPOSITORY_NOT_ALLOWED` | The repository is not one of this connection's. |
| `GITHUB_PULL_REQUEST_REJECTED` | GitHub refused the pull request change; the message is GitHub's own. |
| `INVALID_REPOSITORY_ID` / `INVALID_PULL_REQUEST_NUMBER` / `INVALID_PULL_REQUEST_STATE` / `INVALID_REF` / `INVALID_PAGE` / `INVALID_PER_PAGE` | A query parameter is malformed. |
| `NOTHING_TO_UPDATE` | A pull request update named none of state, title or body. |
