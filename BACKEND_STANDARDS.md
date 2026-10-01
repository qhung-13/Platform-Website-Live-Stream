# OmexLive Backend Engineering Standards v1

**Status:** Target engineering specification for stabilizing and completing the Node.js backend and guiding its incremental evolution. It does not authorize production refactoring, dependency installation, a database replacement, or Spring Boot implementation. [FRONTEND_STANDARDS.md](FRONTEND_STANDARDS.md) governs frontend ownership and consumption of backend contracts; [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) governs presentation. This document governs backend business authority and engineering boundaries.

**Decision labels:** **LOCKED** is required for Backend v1 planning and future implementation. **PROVISIONAL** is a working structural choice. **NEEDS VALIDATION** requires a representative implementation, contract test, deployment test, or product evidence. **EXTERNAL / PRODUCT DECISION** needs an owner outside backend engineering. Section 34 is the status register. Here, **must** is normative, **should** is the default with a documented exception, and **may** is an allowed option.

## 1. Engineering principles

1. Backend v1 remains Node.js, Express, and MongoDB. Evolve it as a lightweight DDD-oriented modular monolith, preserving working HTTP, Socket.IO, media, auth, and payment behavior except for separately tracked defects or approved contract changes.
2. Give every business rule and state transition one owner. Interfaces translate transports; application use cases coordinate work; domain code states business invariants; infrastructure provides persistence and external capabilities.
3. Create only the modules, layers, abstractions, and transactions that solve a real OmexLive problem. Folder names alone do not improve architecture.
4. The backend remains authoritative for authentication, authorization, ownership, content visibility, stream product state, coin balances, and payment fulfillment. The frontend, media service, and AI agent cannot grant those decisions.
5. Separate atomicity, concurrency control, and idempotency. State the invariant and retry behavior before choosing a MongoDB operation.
6. Define API, event, error, and provider contracts independently of Mongoose so Backend v1 becomes a behavioral reference for a future Spring Boot and relational implementation.
7. Treat security, recovery, observability, and testing as part of a use case's design. Preserve a comprehensible Node.js codebase rather than adding generic frameworks for their own sake.

## 2. Current baseline and migration obligations

The present application mounts routes in `backend/index.js`, routes under `backend/src/routes/`, controller-heavy behavior under `backend/src/controllers/`, Mongoose models under `backend/src/models/`, Socket.IO handlers under `backend/src/sockets/`, and a separate `media-service/`. An optional Python `agent-service/` calls backend APIs. These paths are evidence and migration anchors, not the target folder plan.

| Existing concern | Current evidence | Behavior to preserve or explicitly correct |
|---|---|---|
| HTTP and runtime | `backend/index.js`; `backend/src/config/` | Versioned `/api/v1` contract, temporary `/api` alias, startup and shutdown behavior, Mongo/Redis dependencies, webhook raw-body handling. |
| Identity | `UserController.controller.js`; `Auth.middleware.js`; `createToken.js`; `passport.config.js` | OTP and Google OAuth flows, HTTP-only JWT cookie, inactive-user rejection, profile and role behavior. |
| Streaming and media | `StreamController.controller.js`; `streamLiveness.service.js`; `media-service/src/config/mediaServer.config.js` | Signed ingest, distinct playback identity, publish/heartbeat/end, liveness, HLS, creator and viewer behavior. |
| Economy | `CoinController.controller.js`; `Donation.model.js`; `TopUp.model.js` | Server-owned packages, Stripe verification, transaction-safe coin updates, replay protection. |
| Content and social | `VideoController.controller.js`; `ClipController.controller.js`; `CommentController.controller.js`; `FollowController.controller.js` | Upload, visibility, reactions, comments, clips, follows, search, dependent deletion. |
| Realtime and integrations | `backend/src/sockets/`; `backend/src/controllers/NotificationController.controller.js`; `CreatorCoachController.controller.js` | Chat/presence/moderation, notification delivery, approved agent access. |

Before extracting a use case, record its current route, inputs, outputs, authorization, emitted events, external calls, failures, and known bugs. Preserve behavior with characterization and contract tests; correct a confirmed security or data-integrity bug under an explicit stabilization change rather than treating it as required parity. The current utility/socket test suite is not complete behavioral coverage.

## 3. Backend module architecture

**LOCKED conceptual direction:** Interface / Delivery → Application → Domain. Infrastructure implements persistence and external capabilities needed by the upper layers. This is not a mandate for textbook DDD or one directory per layer. A module creates only the layers it needs.

| Candidate business module | Cohesive behavior | Boundary guidance |
|---|---|---|
| Identity | Accounts, credentials, OTP, sessions, roles, account ban/unban. | Owns `BanUser`; does not own the media implementation of ending an active broadcast. |
| Streaming | Draft, schedule, publish, session lifecycle, liveness, public LIVE semantics. | Owns `TerminateStream` and stream transition rules; calls a media capability through an adapter. |
| Content | Video, clip, comment, visibility, upload and deletion rules. | Owns `RemoveVideo` and viewability; coordinates asset cleanup. |
| Social | Follows and reusable social relationship rules. | Reactions may remain with Content if their behavior stays content-local. |
| Economy | Coin balance, packages, Stripe top-ups, donations and economic audit records. | Owns all authoritative coin mutations and fulfillment. |

**PROVISIONAL supporting/read/application capabilities:** Moderation, Notifications, Creator Analytics, and Discovery/Search. Place each near the module that owns its rules until cross-module cohesion justifies an independent capability. Do not create one module per Mongo collection. Administration is a privileged application surface: `BanUser` belongs to Identity, `TerminateStream` to Streaming, and `RemoveVideo` to Content. The media service and Python agent remain external systems, not business-state owners.

A module may contain `application/commands`, `application/queries`, `domain/policies`, `infrastructure/persistence`, and `interface/http|socket|internal`. Those are optional examples, not required empty folders. Exact names and splits are **PROVISIONAL**. No module imports another module's private persistence files; cross-module calls use a narrow public application contract. Avoid circular runtime dependencies and a shared folder that becomes a second application layer.

## 4. Module and dependency rules

Application code may depend on its module's domain policy and declared capabilities. Infrastructure may import and implement those contracts. Delivery code may call application use cases and map their results; domain code must not import Express, Mongoose, Socket.IO, Stripe, Cloudinary, Redis, email, or the agent client. An application function can directly use a local persistence implementation when an interface adds no value; it must not expose a Mongoose document as its business result.

Shared technical code may provide configuration, transport helpers, clock/ID generation, logging, error mapping, and transaction support. Shared code must not accumulate OmexLive business decisions. Cross-module workflows name an owning use case and invoke other modules through explicit capabilities; do not bypass another module's rules with direct model writes. A temporary migration adapter may cross a boundary only with its owner, affected routes, tests, and removal condition recorded.

## 5. Delivery and controller rules

HTTP controllers, Socket.IO handlers, webhook handlers, and authenticated media callbacks are delivery adapters. Their normal sequence is **parse input and actor/context → validate transport shape → invoke a use case/query → map structured result/error to the transport**. Transport code may enforce request size, parse IDs, verify signatures, and select HTTP status. It must not be the permanent home for multi-model workflows, payment rules, stream state machines, complex ownership, notification decisions, or provider orchestration.

Transport authentication must finish before passing a trusted actor to an application use case. An internal service secret identifies the calling service; it does not by itself authorize arbitrary product actions. A Socket command with the same business meaning as an HTTP command should call the same application behavior. Expected business rejection is a mapped result, not an uncaught crash. Keep existing routes stable during extraction; a transport-contract change needs versioning or an approved compatibility plan.

## 6. Application commands and queries

**LOCKED:** meaningful operations have explicit application use cases. Examples are `DonateCoins`, `CompleteTopUp`, `PublishStream`, `EndStream`, `DeleteVideo`, and `BanUser`. Each defines actor, input, preconditions, authoritative writes, transaction/concurrency mechanism, external prerequisites, post-commit effects, result, and replay behavior. A named function or module is sufficient; classes, command buses, and query buses are optional only when they solve measured complexity.

Use an explicit query when a read combines access policy, reusable filtering, projections, cross-model composition, analytics, or freshness semantics: `GetStream`, `GetViewableVideo`, `SearchVideos`, or `GetCreatorAnalytics`. A trivial local lookup may remain a direct query. Command/query separation expresses intent; it does not require event sourcing, separate databases, or distributed CQRS. State changes must not hide in query handlers.

## 7. Domain modeling

Model real invariants, not framework patterns. Candidate policies include sufficient coins and non-self donation, valid donation recipient, top-up state and package correspondence, stream session transitions, content viewability, and resource ownership. Use a plain function when it states the rule clearly. Introduce an entity with behavior, value concept, aggregate, factory, or domain event only after a specific invariant, duplicate implementation, or testing problem warrants it.

Domain vocabulary should use product terms such as `LiveSession`, `CoinBalance`, `Donation`, and `ViewableVideo`, not `ObjectId`, `populate`, `save`, or HTTP status. Monetary and coin amounts must be validated as bounded integers in their authoritative units. Domain rules must be enforced on every entry path, including admin, socket, media callback, webhook, and agent tools when applicable.

## 8. Input validation

Separate transport/input validity from business validity. Delivery validates required fields, types, ID syntax, enum syntax, length, upload size/type, request body limits, and provider signature format. Application/domain behavior validates sufficient balance, active-account restrictions, legal stream transitions, content visibility, ownership, and valid donation targets. A syntactically valid request can still be rejected by a business rule.

Normalize at the boundary before invoking a use case; do not let Mongoose casting be the primary request validator. Bound search terms, pagination, regex work, list sizes, and external payload sizes. Treat Stripe events, media callbacks, Socket payloads, and agent calls as untrusted until their authentication and schema are verified. A schema-validation library may be evaluated after repeated real duplication is measured; none is prescribed or installed by this specification. Frontend validation is UX and does not replace backend policy.

## 9. Authentication, authorization, ownership, and visibility

**LOCKED:** authentication, role authorization, resource ownership, and resource visibility are distinct checks. Authentication establishes an actor at an entry point. The relevant application policy/use case enforces role, ownership, account status, and visibility for the requested action. A frontend route guard is never security authority. OmexLive has no established Organization or tenant domain; do not import tenant-scoped patterns without a product requirement.

Preserve HTTP-only cookie handling, JWT verification, OTP/Google flows, anonymous public viewing, and inactive-account rejection while their security details are hardened. Cookie topology, origin/CSRF protection, OAuth return behavior, and Socket authentication must be tested under the final deployment hosts. Do not expose the JWT to browser JavaScript to support frontend rendering. Sensitive internal endpoints use authenticated service identity and a narrow allowed action; validate replay and request context where needed.

**LOCKED v1 visibility preference:** anonymous `GET /videos/:id` sees only publicly viewable content; an authenticated owner may see their own private content under the policy; an admin's access follows moderation policy. One content visibility policy must govern detail, comments, reactions, clips, public metadata, and related reads. A separate private route is not required solely because visibility differs. Return 404 or 403 according to an explicit disclosure policy; do not leak private media URLs, comments, or metadata through an adjacent endpoint. The precise owner/admin presentation and concealment policy beyond these rules is an **EXTERNAL / PRODUCT DECISION**.

## 10. Persistence and repository rules

Do not make a generic repository per Mongoose model. Introduce an intent-oriented persistence boundary when it protects repeated policy, a conditional write, multi-document consistency, domain tests, or the future MongoDB-to-relational change. Examples: `debitIfSufficient`, `claimPendingTopUp`, `findViewableVideo`, `transitionActiveSession`, and dependent-content delete planning. Specify the operation's match predicate, returned outcome, and concurrency semantics.

Direct Mongoose access may remain in module infrastructure, a simple local query, or application code where persistence behavior stays local and no cross-module contract leaks. Do not expose Mongoose documents, mutable populated references, sessions, or query builders beyond that boundary. Keep indexes and persistence optimizations in infrastructure. Abstractions must represent a useful capability, not a CRUD pass-through.

## 11. Transactions

**LOCKED:** define the business unit of work before using a transaction. A single independent atomic document write generally needs no explicit multi-document transaction. Use a transaction when multiple documents must form one valid result: donation debit/credit/record, top-up claim/credit, and symmetric follow/unfollow are current justified examples. Keep transactions short, pass the same session to every participating MongoDB operation, and avoid parallel operations inside one transaction unless driver behavior is explicitly validated.

Stripe, Cloudinary, media control, email, Redis, and Socket.IO are outside MongoDB transactions. Do not call them within a transaction callback or assume a database rollback reverses them. Transactional use cases require a replica-set or sharded MongoDB deployment; verify the actual environment and tests rather than inferring support from a connection string. Docker Compose currently configures `rs0`, while example URIs and other environments require validation. [MongoDB documents single-document atomicity](https://www.mongodb.com/docs/v8.0/core/write-operations-atomicity/) and [transaction deployment requirements](https://www.mongodb.com/docs/v8.0/data-modeling/enforce-consistency/transactions/).

## 12. Concurrency

**LOCKED:** atomicity ≠ concurrency control ≠ idempotency. A transaction does not replace a condition that guards stale or competing updates. Use the narrowest correct mechanism: expected-state predicates, conditional `findOneAndUpdate`, `$inc`, unique indexes, version/session predicates, or a multi-document transaction when needed. Record what happens if no document matches or a unique constraint conflicts.

Preserve donation's conditional sufficient-balance debit plus transaction and unique replay key. Preserve top-up's pending-state claim plus transaction and unique provider identity. Stream transitions must identify the active session so an old callback cannot end or revive a newer one. Avoid read-then-unconditional-save for contested state. Do not translate Rails `lock!` idioms into Mongoose by name; test the actual interleavings. MongoDB's single-document atomic update predicates and `$inc` are the relevant primitives. [MongoDB atomicity and concurrency guidance](https://www.mongodb.com/docs/v8.0/core/write-operations-atomicity/).

## 13. Idempotency

Define idempotency where a retry or duplicate delivery could change the result. A replay contract specifies identity scope, input fingerprint or equivalence, stored result/state, conflict behavior for key reuse with different input, retention, and behavior after an uncertain response. Do not build idempotency machinery for harmless reads.

| Workflow | Required approach |
|---|---|
| Donation | Client-provided key scoped to sender, unique database constraint, same-input replay result, different-input conflict; debit/credit/record once. |
| Top-up creation and completion | Reuse one intended PaymentIntent for a retryable checkout; use Stripe request idempotency where appropriate; claim pending TopUp before one credit; reconcile unknown provider/database outcomes. |
| Stripe webhook | Verify signature and event type; tolerate duplicate/out-of-order delivery; use provider identity, state claim, and event ID tracking when needed for side-effect replay. |
| Media publish/heartbeat/unpublish | Authenticate callback and match the intended broadcast session; old-session replay must not mutate the current session. |
| Destructive commands | Define whether repeated delete/end returns the prior result or a stable already-completed/not-found outcome; never repeat an unsafe provider effect blindly. |

Stripe's [idempotent request contract](https://docs.stripe.com/api/idempotent_requests) applies to provider API retries; the backend's own unique keys and state claims remain necessary for local fulfillment.

## 14. Side effects and commit boundaries

For each use case, document **(A) external validation or prerequisite, when required → (B) authoritative database unit of work → (C) post-commit effects**. This is a reasoning model, not a fixed ordering for every provider. For example, Stripe intent creation precedes local pending-record creation and therefore needs recovery if the database write fails; media termination may precede an end transition and needs a defined response if termination is uncertain. A post-commit Socket emit must not change a committed donation into a reported failure.

Every external effect specifies its ordering, failure meaning, timeout, retry safety, compensation or reconciliation, and durability requirement. Notification, email, socket broadcast, Cloudinary cleanup, media control, Stripe, and AI calls cannot join a MongoDB transaction. A best-effort effect may log failure and continue only when product behavior permits loss. If eventual completion is required, persist retry intent or use another durable strategy; do not assume an in-process promise survives a crash. Do not introduce a queue or outbox automatically.

## 15. Error architecture

Use a structured application failure with a stable code, category, safe client message or message key, optional field errors, retryability, and internal diagnostic cause. Transport adapters map it to HTTP or Socket responses; provider/Mongoose exceptions are normalized before reaching clients. Never make arbitrary English `Error.message` the frontend contract.

| Category | Typical HTTP mapping | Examples |
|---|---:|---|
| `VALIDATION` | 400 or 422 | Malformed fields, unsupported enum, invalid upload. |
| `UNAUTHENTICATED` | 401 | Missing or expired session. |
| `FORBIDDEN` | 403 | Authenticated actor lacks permission. |
| `NOT_FOUND` | 404 | Missing resource or deliberately concealed private resource. |
| `CONFLICT` | 409 | State changed, duplicate key, session mismatch. |
| `BUSINESS_RULE` | 400/409/422 by contract | `INSUFFICIENT_COINS`, invalid transition. |
| `RATE_LIMITED` | 429 | Request/actor throttle with retry hint where safe. |
| `DEPENDENCY_UNAVAILABLE` | 502/503/504 | Stripe, media, email, or database unavailable; retryability depends on operation. |
| `INTERNAL` | 500 | Unexpected defect; generic client message. |

Codes such as `TOP_UP_ALREADY_COMPLETED`, `STREAM_SESSION_MISMATCH`, and `VIDEO_NOT_VIEWABLE` are illustrative and require contract review before use. Do not expose stack traces, provider payloads, stream keys, OTPs, tokens, or internal causes. Log diagnostics with correlation ID and redaction. Preserve existing HTTP behavior during extraction unless an approved contract change or defect correction requires a new mapping. Frontend standards consume stable backend codes and localize product copy.

## 16. API DTO and contract rules

Public API contracts must be independent of Mongoose Document behavior, MongoDB `ObjectId` semantics, `populate()` output shape, schema hooks, and implementation-only fields. Treat identifiers as opaque strings at the API boundary. Use explicit DTO mapping when a document leaks private fields, `_id`, or an ID-or-populated-object union; avoid mapping ceremony for identical trivial values. Public, owner, admin, internal-service, and agent responses can have different projections according to their access policies.

Version behavior when a breaking change cannot be compatible. Define optional/null/omitted semantics, timestamp and currency units, pagination bounds, error shape, and event payload versions where relevant. Avoid accidentally changing `/api/v1` while a future `/api/v2` is introduced. Existing `/api` aliases are legacy and may be retired only after client inventory and an approved migration window. API output and public metadata must use the same visibility decision. Do not serialize credentials, raw playback identifiers, private content, or provider secrets into public payloads.

## 17. Streaming

Streaming owns draft/schedule/publish/heartbeat/end rules and the public meaning of LIVE. **LOCKED:** each active broadcast has an explicit session identity, and every state-changing media callback must target its intended session. Late callbacks from an old session must not mutate a newer one. The exact identity mechanism—playback/session ID, version, dedicated token, or another validated choice—is **NEEDS VALIDATION**.

Separate operational lifecycle from public playable state. A publisher may be connected while HLS is preparing. Public LIVE must mean a current session the product considers playable; a PREPARING-like semantic state may be needed. The exact readiness signal and timeout are **NEEDS VALIDATION** with the media service. A public payload must not claim LIVE while withholding every playable URL because liveness or session identity is stale. Scheduled, draft, preparing, live, ended, and stale conditions must have defined transitions and response semantics.

Creator end, media unpublish, admin termination/ban, and stale sweep must converge on one lifecycle policy, with conditional state updates and post-transition events. User `isLive` is a derived or coordinated projection, not an independent authority. Define media-control timeout and reconciliation when the publisher stops but the database update fails, or the database marks offline while ingest persists. Public reads must filter or serialize against the same freshness policy.

## 18. Realtime and Socket boundary

Socket.IO handlers own connection authentication, rooms, presence transport, chat/reaction rate limiting, and event delivery. They must not become a second business architecture. A durable state-changing Socket action invokes the same application use case or policy as an equivalent HTTP action. Backend authorization is checked at action time where permissions can change after connection, particularly bans and moderation.

Presence and reactions may remain ephemeral; durable stream state, coin balance, moderation decisions, and notifications reconcile from backend authority. Bound buffers and TTLs, clean up on disconnect, and define multi-instance behavior with Redis. Redis adapter availability does not by itself make every memory fallback consistent across instances. Event payloads need stable IDs where consumers deduplicate, and the owning use case decides whether an event is required, best effort, or recoverable from a query. Socket errors use structured codes without exposing diagnostics.

## 19. Media service boundary

The separate media service owns RTMP ingest, signed OBS publish validation, FFmpeg/HLS, media process mechanics, and playback file delivery. The backend owns creator authorization, product stream records, active-session identity, public visibility/LIVE meaning, and lifecycle decisions. The media service may report observations or execute termination, but it is not the authoritative product database.

Service-to-service callbacks must authenticate the caller, validate input, identify the exact session, and be replay safe. Preserve separation of private ingest key and public playback identifier. Do not send ingest credentials in public stream payloads or HLS URLs. Define callback retries, heartbeat cadence, stale cutoff, termination acknowledgement, and readiness signal as a tested cross-service contract. Static shared secrets are a current mechanism, not proof that replay or session attribution is solved.

## 20. Economy

The backend owns package prices, coin grants, balances, donation rules, payment verification, and fulfillment. For Backend v1, `User.coins` may remain the operational balance; TopUp and Donation records provide transaction and audit history. A general ledger is **not required solely to declare v1 complete**. It becomes a candidate when refunds, chargebacks, grants/promotions, manual adjustments, stronger reconciliation, or richer accounting require it.

Package ID selects server-owned amount and coin grant. Never accept client-calculated prices or credit coins from a browser's Stripe success signal. Verify Stripe identity, status, currency, amount, user, and package/grant correspondence before completion. Fulfillment must be safe from webhook and user-confirmation races and from duplicate delivery. Donation must atomically check sufficient balance, debit, credit, and persist the record, with sender-scoped replay protection. Avoid floating-point authority for money; provider minor units and coin units must be explicit in contracts.

On uncertain provider or database outcomes, reconcile with Stripe and local TopUp state before another charge or credit. Define handling for succeeded provider intents with missing or mismatched local records, failed/canceled intents, and delayed webhooks. Provider recovery and support UX are an **EXTERNAL / PRODUCT DECISION**; no silent discard or blind retry is acceptable. Stripe recommends server-side fulfillment from payment events because a browser callback may never arrive. [Stripe payment-event guidance](https://docs.stripe.com/payments/payment-element/migration).

## 21. Content

Content owns video and clip lifecycle, viewability, metadata, comments, reactions, and removal policy. One visibility decision must apply to detail, comments, reactions, clips, discovery and search results, and public metadata. Anonymous detail is limited to public content; owner and admin exceptions follow Section 9. Processing content is not automatically public. A private object's identifier or known comments must not bypass its visibility gate.

Uploads validate file type/size and authorization on the backend; Cloudinary is an asset provider, not the content-state authority. Persist the asset identity needed for cleanup. Removing a VOD must account for dependent clips and comments. Define whether the database deletion is transactional, marked for deletion, or otherwise recoverable; external asset deletion is separately retried or audited according to its durability requirement. Owner and admin removal use the same core Content use case with distinct authorization context. Do not make an HTTP 200 imply remote cleanup succeeded unless the contract truly guarantees it.

## 22. Administration and moderation

Administration composes privileged application use cases rather than duplicating Identity, Streaming, and Content rules in one Admin service. Admin listing/reporting is a read surface; role change, account ban, stream termination, and video removal each have their owning use case and audit context. Prevent self-ban/self-demotion according to explicit policy. An account ban must revoke future HTTP and Socket privileges and have a defined media-termination/reconciliation path.

Stream-local timeout/ban is a supporting Moderation capability. The streamer or admin may invoke it under policy; the AI agent may only call an approved backend tool with scoped authorization. Chat enforcement must use the same moderation state as the command path. Decide whether a moderation action is ephemeral or durable, how it survives Redis failure/restart, and whether a banned user can still view anonymously. Preserve traceability of actor, target, stream, reason, and expiry where product or safety policy requires it.

## 23. Notifications

The originating use case owns the decision to notify; Notifications owns persistence and delivery. Do not let a notification write decide whether a committed donation, follow, or stream transition happened. Classify each notification type as best effort or eventual delivery. Best-effort failure is observable but may not fail the initiating command. Eventual delivery requires a durable retry/reconciliation mechanism and a deduplication identity.

Specify recipient, actor, type, localized/presentation data, safe destination, and visibility implications. Avoid baking arbitrary English or Vietnamese sentences into the permanent event contract when the future frontend supports `vi` and `en`. Notification links must be safe for the locale-aware frontend routing contract. Do not add a queue for every notification merely because Redis is available.

## 24. AI agent boundary

The Python agent is an external advisor. It may read approved analytics and return advice or proposals through a backend-owned contract. It must not directly persist product state, decide authorization, or bypass application use cases. Agent-triggered state changes route through authenticated, scoped backend APIs/tools and require explicit user confirmation when the consequence warrants it.

Validate agent service identity, input bounds, downstream timeout, and safe response shape. Do not trust a shared agent secret as permission to act for any user without a use-case-specific authorization model. Keep the tool/API contract stable enough that a Spring Boot backend can replace Node without forcing the agent to learn MongoDB document shapes.

## 25. Mongoose and data access

Mongoose is a Backend v1 persistence tool, not domain language. Use narrow projections for public and sensitive reads; use `lean()` for read-only queries when document methods, getters, or hooks are unnecessary and the output has been reviewed. `populate()` is an internal join convenience, not a public union-shaped contract. Bound pagination, sort choices, regex terms, and result sizes; review index support for actual query shapes. Avoid unbounded scans in analytics and discovery as data grows.

Define unique/partial indexes alongside the invariant they enforce and verify deployment builds them. Prefer conditional updates and `$inc` to read-modify-save for contested counters or balances. Use timestamps as explicit instants; make time zone presentation a client concern unless a scheduled business rule requires a zone. Schema validation and hooks may protect persistence integrity but must not be the only place a cross-entry business rule lives. Password hashing remains a persistence/security concern; application tests must verify its externally visible behavior. Record which legacy fields and migrations remain necessary before deleting them.

## 26. Configuration and secrets

Centralize configuration parsing and startup validation. Distinguish required settings, optional integrations, public operational values, and secrets. A feature may report unavailable when its optional provider is unconfigured; a required backend capability must fail startup clearly. Production must not silently fall back to localhost, development credentials, or permissive origins. Validate URL schemes/origins, timeouts, limits, and secret lengths without printing secret values.

Keep JWT, service, Stripe, Cloudinary, SMTP, stream-key, OTP, and provider secrets out of responses, logs, frontend bundles, and public error messages. Rotate service secrets and credentials through an operational procedure; separate media publish authentication from media callback/control authentication. Validate MongoDB transaction topology, Redis scaling assumptions, webhook endpoint configuration, cookie/origin behavior, media/CDN origins, and optional agent configuration in each deployment. The final frontend/API host and cookie/session topology remains an external architecture decision shared with Frontend Standards.

## 27. Logging and observability

Assign a request/correlation ID at HTTP ingress and propagate it through application work and outgoing provider calls where feasible. Include a safe operation name, actor or resource ID when permitted, outcome, duration, dependency, and error code in structured logs. Never log JWTs, OTPs, stream keys, Stripe secrets/client secrets, card data, full private payloads, or user-generated text by default. Log provider status and timing without exposing credentials.

Track stream lifecycle transitions and callback mismatch/replay, media heartbeat gaps, donation/top-up claim outcomes, webhook reconciliation, admin actions, and failed post-commit effects. Health endpoints distinguish process liveness from readiness of required dependencies; optional provider failure should be visible without necessarily taking the core API down. Define useful counters/alerts during implementation and measure them before choosing a vendor. Do not rely only on `console.error` strings to reconstruct a payment or stream incident.

## 28. Background work

Classify work before adding a runner: synchronous required work, best-effort post-commit work, durable retryable work, or scheduled maintenance. Current stream stale sweep is scheduled maintenance; Cloudinary cleanup and notification delivery require a durability decision per use case. A provider reconciliation process is justified when a paid top-up can remain uncertain after a request or webhook interruption.

An in-process timer or fire-and-forget promise is not durable across restart. If a business guarantee requires eventual completion, persist enough state to retry idempotently, bound attempts, record dead-letter/manual-recovery cases, and monitor lag. Do not add Redis queues solely because Redis already supports Socket.IO; select a mechanism after naming the concrete work and failure guarantee.

## 29. Testing architecture

Test at the narrowest level that proves a rule, then cover high-risk journeys end to end.

| Level | Required confidence |
|---|---|
| Domain | Pure invariants: donation amounts, visibility, legal stream transitions, policy outcomes. |
| Application command/query | Actor and ownership checks, transaction orchestration, replay, post-commit behavior, recovery branches. |
| Persistence/integration | Conditional updates, unique indexes, transactions, DTO mapping, and MongoDB replica-set behavior against a real test database. |
| HTTP contract/request | Auth, validation, status/error codes, private/public projections, raw Stripe webhook body, versioned routes. |
| Socket/realtime | Connection authentication, room lifecycle, moderation, event payloads, reconnection and multi-instance assumptions. |
| Cross-service | Signed ingest, publish/heartbeat/unpublish session attribution, media termination, Stripe webhook replay and reconciliation, agent tool contract. |
| Critical end to end | OTP/OAuth login, content visibility, stream start/end, donation, top-up, admin ban, video deletion. |

Prioritize behavior and failure interleavings over coverage percentage: insufficient balance under concurrent donations, confirmation/webhook race, late old-session callback, Cloudinary failure after database work, media termination uncertainty, and banned active sockets. Preserve `vi`/`en`-safe error codes and frontend contract compatibility. The current `npm test` baseline observed during investigation was **22 passing, 1 failing**; `streamPayload.test.js` expects an HLS URL without a fresh heartbeat. Treat that as stabilization evidence, not a permanent acceptance target. Select any new test tooling during implementation, not in this specification phase.

## 30. Backend v1 completeness and stabilization

Keep backlog classes distinct:

| Class | Meaning | Current examples or decision |
|---|---|---|
| **BUG / HARDENING** | Existing behavior violates a security, data, or stated contract. | Private-video detail exposure; comments visibility inconsistency; stale `isLive` with missing HLS semantics; plaintext OTP storage review; multi-step video deletion; stream callback/session race; failing stream-payload test. |
| **ARCHITECTURE REFACTOR** | Behavior-preserving ownership/boundary improvement. | Extract controller use cases, share visibility and stream transition policies, isolate provider and persistence contracts, structure errors and DTOs. |
| **MISSING PRODUCT CAPABILITY** | A confirmed product requirement with no working behavior. | Record only after product evidence; do not infer from an architecture diagram. Payment recovery/support and notification guarantees need a product decision. |
| **OPTIONAL FUTURE ENHANCEMENT** | Useful only when demand justifies it. | General coin ledger, durable notification worker, richer analytics/search infrastructure. |
| **LEGACY / RETIREMENT** | Compatibility surface or unused schema requiring consumer/data verification. | Unmounted donation payment-intent route, temporary `/api` aliases, `refreshToken`, old Stream `streamKey`, and other legacy stream fields. |

Stabilization issues belong in tests and a tracked implementation backlog; they are not permanent architecture rules. Backend v1 is complete when approved product journeys, access policy, economy replay/reconciliation, live-session behavior, cross-service contracts, operational recovery, and representative failure tests are reliable. Do not label every imaginable feature mandatory for v1.

## 31. Node v1 → Spring Boot v2 compatibility

Backend v1 becomes the behavioral reference for Backend v2. Stabilize HTTP and Socket contracts, structured errors, use-case names and outcomes, auth/ownership/visibility rules, transaction and concurrency semantics, idempotency, media callbacks, and provider reconciliation. Build contract fixtures and tests that both implementations can pass. Preserve existing resource identifiers as opaque API strings or provide an explicit mapping/compatibility plan; do not require consumers to understand MongoDB IDs.

The future Spring Boot and relational design may use JPA/Hibernate and normalized relations for follows, reactions, donations, top-ups, comments, and notifications. That persistence choice must not rewrite product semantics or authorize a simultaneous backend/frontend/visual redesign. Do not translate Express controller files into Java classes line by line. Any intentional contract break needs an approved versioning and migration plan.

## 32. Incremental migration strategy

For each bounded use case: understand current behavior and known defects → capture request/application/contract tests → extract one named application use case → move its invariant or policy → isolate persistence/provider interaction where useful → keep transport contract stable → measure and repeat. Prioritize security and economy stabilization, then stream session consistency, then content deletion and shared access policy, while sequencing actual edits by testability and release risk.

Run old and extracted paths through the same external contract during transition; do not move every controller at once. Separate stabilization changes from architecture-only changes in review so behavioral differences remain visible. A module is complete when all entry paths call its authoritative rule and obsolete duplicate logic is removed. Folder moves, unused interfaces, and empty layers are not milestones.

## 33. Engineering governance checklist

Before a state-changing endpoint ships or is extracted:

1. Name the owning module and use case, actor, transport inputs, business invariants, ownership/visibility rule, and stable result/error codes.
2. Identify each authoritative document and the unit of work; state the atomic update predicate, transaction need, unique constraint, and concurrency/replay behavior separately.
3. List every provider and post-commit effect with ordering, timeout, retryability, reconciliation, and durability requirement.
4. Confirm DTO projection, sensitive-field exclusion, API version compatibility, and frontend-visible behavior in both locales through stable codes and data.
5. Add focused tests for success, rejection, uncertain outcome, concurrent attempt, duplicate delivery, and old-session replay where relevant.

Before deployment, validate actual MongoDB topology, Redis mode, media/CDN connectivity, webhook configuration, cookie/origin topology, secret handling, observability, and rollback. An exception records its owner, affected endpoints, concrete reason, tests, and removal condition. Update the decision register when a provisional choice becomes validated.

## 34. Decision status register

| Status | Decisions | Closure or evidence |
|---|---|---|
| **LOCKED** | Lightweight DDD-oriented modular monolith; Interface → Application → Domain direction with infrastructure capabilities; optional layers only as needed; thin delivery adapters and explicit use-case intent. | Enforce through one-use-case extractions and dependency review. |
| **LOCKED** | Distinct authentication, role authorization, ownership, and visibility; backend authority for security/economy; shared content visibility policy; anonymous video detail limited to public content. | Contract and access-policy tests across HTTP, Socket, metadata, and internal paths. |
| **LOCKED** | Transactions by business unit of work; atomicity ≠ concurrency ≠ idempotency; conditional economy writes and replay protection; session-safe stream callbacks. | Concurrent and duplicate-delivery tests on a transaction-capable MongoDB deployment. |
| **LOCKED** | Intent-oriented persistence boundaries where useful; stable structured errors; persistence-independent API DTOs; media and agent as external boundaries; incremental refactor over big-bang rewrite. | Review of public contracts and module tests. |
| **PROVISIONAL** | Exact folder names; exact moderation, discovery, analytics, and notification module split; general coin ledger as a future capability rather than a v1 gate. | Adjust with real use cases and product accounting needs. |
| **NEEDS VALIDATION** | Exact active-stream session identity; media-readiness signal and public LIVE transition; persistence abstractions per module; which notifications need durable delivery; MongoDB replica-set configuration in every environment; cross-service failure/replay behavior. | Representative implementation, real service tests, and deployment checks. |
| **EXTERNAL / PRODUCT DECISION** | Notification delivery guarantees; final owner/admin private-content and concealment policy beyond Section 9; legacy API retirement; payment-provider recovery and support UX; final frontend/API host and cookie topology. | Product/deployment owner approval and corresponding contract tests. |

### References (informative)

- [MongoDB: Atomicity and Transactions](https://www.mongodb.com/docs/v8.0/core/write-operations-atomicity/)
- [MongoDB: Transaction deployment requirements](https://www.mongodb.com/docs/v8.0/data-modeling/enforce-consistency/transactions/)
- [Stripe: Idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- [Stripe: Server-side payment-event handling](https://docs.stripe.com/payments/payment-element/migration)
