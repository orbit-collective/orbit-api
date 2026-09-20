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

Relay events expire after 24 hours.

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