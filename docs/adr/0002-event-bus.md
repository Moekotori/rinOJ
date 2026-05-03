# ADR-0002: Event Bus Selection

Status: Proposed  
Date: 2026-05-02

## Decision

Rin OJ will start with Redis Streams as the default `EventBus` implementation and keep a NATS implementation as the first replacement target once cross-cluster fanout or higher subscriber isolation becomes necessary.

## Context

The platform needs durable events such as `submission.judged`, `contest.started`, `user.registered`, `problem.published`, and notification events. Events drive webhooks, notifications, rating jobs, search indexing, audit projections, and future plugins.

Redis 7 is already a locked dependency for cache, Asynq, Pub/Sub, rate limits, and leaderboard ZSet. NATS is allowed by the architecture constraints and is attractive for long-term event fanout, but it adds another runtime dependency before the core platform exists.

## Options

| Candidate | Performance | Ecosystem | Maintenance | Tradeoff |
| --- | --- | --- | --- | --- |
| Redis Streams | Very good for initial throughput, durable consumer groups, simple local deploy. | Already part of Rin OJ stack. Works with Go clients and Asynq-adjacent operations. | Redis 7 is mature and actively maintained. | Best first implementation; less specialized than NATS for large event meshes. |
| NATS JetStream | Excellent pub/sub and stream semantics, strong service-to-service event story. | Strong cloud-native ecosystem. | Actively maintained. | Better long-term fanout, but adds another required service on day one. |
| Redis Pub/Sub only | Low latency. | Already available. | Mature. | Not durable enough for webhooks, audit, or rating jobs. |

## Rationale

- Performance: Redis Streams is sufficient for the first target while keeping local development simple.
- Ecosystem: Redis is already mandatory, which makes `docker compose up` easier for contributors.
- Maintenance: Redis and NATS are both healthy; the explicit `EventBus` interface lets Rin OJ migrate later without changing domain services.

## Consequences

- Events must be versioned envelopes, not ad hoc JSON blobs.
- Consumers must be idempotent because Redis Streams and webhook retries can redeliver.
- Webhook delivery uses the same event stream and signs payloads with HMAC.
- The `EventBus` package must not expose Redis-specific stream IDs to domain services.

## Initial Topics

- `user.registered`
- `problem.draft_created`
- `problem.import_validated`
- `problem.published`
- `submission.queued`
- `submission.running`
- `submission.judged`
- `contest.started`
- `contest.scoreboard_frozen`
- `contest.scoreboard_unfrozen`
- `notification.created`
- `webhook.delivery_failed`
