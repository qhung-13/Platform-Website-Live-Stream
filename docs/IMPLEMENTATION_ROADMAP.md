# OmexLive Implementation Roadmap

**Status:** Execution plan, not implementation authorization for any individual ticket. The developer writes production code; Codex mentors, traces, reviews, and helps debug. This plan follows [ARCHITECTURE.md](ARCHITECTURE.md), [BACKEND_STANDARDS.md](BACKEND_STANDARDS.md), [FRONTEND_STANDARDS.md](FRONTEND_STANDARDS.md), and [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md). Revisit ordering when a dependency is disproved by code or deployment evidence. The separate media service remains the media-mechanics owner.

## 1. Current execution baseline

The checked-in application is a Vite/React/TypeScript SPA, Node/Express/Mongoose product backend, separate Node media service, Redis for transient realtime coordination, MongoDB for durable product data, and an incomplete optional Python agent. The future targets are Next.js App Router and, after Node v1 is stable, Spring Boot with relational persistence. The standards are target contracts; they are not evidence that the target behavior already exists.

Read-only checks on 2026-09-29: backend npm test ran **22 passing, 1 failing**. The failure is backend/src/utils/__tests__/streamPayload.test.js: its first case expects an HLS URL while serializePublicStream returns null without a fresh heartbeat. Frontend npm test ran **12 passing across 3 files**. These are sparse baselines, not complete journey coverage. The initial sandbox could not spawn test workers (EPERM); the results above are from approved reruns outside the sandbox. No production code was changed for this check.

**Platform starting point:** backend/package.json runs Node's built-in test runner; frontend/package.json runs Vitest. Jest is not configured as a test runner; the frontend's jest-dom matchers do not change that. docker-compose.yml already describes frontend, backend, media-service, MongoDB, Redis, and an optional agent profile; backend/frontend/media Dockerfiles exist. No Jenkins pipeline or Kubernetes manifests are checked in. The optional agent currently has no checked-in Dockerfile. These are starting facts for Section 13, not a reason to replace working tools or start extra services immediately.

Confirmed code-path risks to address before declaring v1 reliable include: public video detail filtering only processing status, related comment/reaction/clip paths with differing visibility rules, direct asset URLs that do not establish private delivery, LIVE state diverging from HLS playability, old media callbacks lacking a distinct active-session guard, OTP storage/attempt handling, uncertain provider cleanup on multi-step deletion, and economy retry/reconciliation. Relevant starting points are backend/src/controllers/VideoController.controller.js, CommentController.controller.js, ClipController.controller.js, StreamController.controller.js, CoinController.controller.js, backend/src/utils/streamPayload.js, and media-service/src/services/streamKeyRegistry.service.js. Each ticket must retrace its own path before coding; this paragraph is a map, not a substitute for that trace.

Admin already exposes stats, user lists/role/ban, video lists/delete, and stream lists/end through backend/src/routes/AdminRoute.route.js. It does not yet prove the requested searchable, detailed console experience. Creator analytics currently derives an "avgViewers" field from sampled peak viewer counts; retention, watch time, and per-minute concurrency are not available from the recorded data. Agent main.py and orchestrator.py are empty, so the Creator Assistant is a later capability.

## 2. Roadmap principles

1. Work in this order when a dependency is hard: **security → data integrity → behavioral correctness → testability → stable contracts → architecture extraction → frontend migration → new capabilities → backend replacement**. An unrelated independent item can proceed while a deployment or product decision is pending.
2. Start each item with just-in-time tracing of its own current behavior, authority, invariants, failures, and interfaces. Do not require a study of the entire system before writing the first fix.
3. Separate a behavior fix from the later extraction of a use case. Keep one conceptual change and a reviewable diff per item when practical.
4. Characterize important existing behavior before changing it; prove the new behavior with the narrowest useful test and a representative boundary check. Test count or coverage percentage is not the goal.
5. Preserve public URLs, user tasks, payment outcomes, realtime participation, and media playback across migrations. Node and Next may coexist only under explicit route ownership and session/callback behavior.
6. Keep one authority: backend for product decisions, database for durable product state, media for ingest/transcode/HLS mechanics, Stripe for external payment outcome, Redis for transient coordination, agent for advice, frontend for presentation.
7. Mark unresolved product and deployment choices as gates. A roadmap item does not silently promote a provisional design value to law.

For every item the learning loop is: business purpose → trace current path → name authority and invariants → study concepts → agree on a small design → developer implements → test → Codex reviews the diff → developer revises → commit.

## 3. Dependency map

~~~text
R01 baseline
  ├─ R02-R05 public content visibility → R17 GetViewableVideo → R23 DTO/contracts
  ├─ R06-R07 OTP/session UX ────────────────────┐
  ├─ R08 deletion/provider cleanup ───────────┤
  ├─ R09-R11 LIVE/session/readiness ───────────┼→ R20 Publish/End → R50-R51 Node v1 freeze
  └─ R12-R13 economy/reconciliation → R18-R19 ┘
R14 scoped service authority → R15 media DB decoupling → R58 Spring/media parity
R16 private asset delivery gate → private-content completion claim
R22-R25 errors, DTOs, legacy retirement, contract fixtures → R28-R33 Next foundations
R26-R27 Design System → R34-R40 bounded route migration/redesign
R28-R33 Next shell, locale, theme, API/store, session, metadata → R34-R43 routes/admin
R41-R43 admin prerequisites → R50 Node completion gate
R44 truthful analytics → R45 improvements → R47 read-only AI → R48 proposals → R49 optional actions
R50-R51 Node behavioral freeze → R52-R63 Spring implementation and cutover

Parallel platform track (P IDs; practice alongside application work unless a real gate is named):
P01 Jest regression/request tests ↔ R01-R05
P02 existing Docker Compose stack ↔ M0-M1
P03 Jest integration/concurrency/contracts ↔ R08-R13, R25, R50
R06 + R07 → P04 Keycloak investigation → P05 identity ownership decision
P05 "adopt" + deliberate ARCHITECTURE.md/BACKEND_STANDARDS.md update → P08 Keycloak pilot
P01/P03 + meaningful build checks → P06 Jenkins CI (checkout → install → lint → test → build)
P02 + relevant route/image readiness → P07 stable images → P09 small Kubernetes subset
P09 manifests/kubectl → P10 config/secrets/health → P11 ingress/storage/multi-service
P10/P11 + observed cross-service diagnosis need → P12 optional centralized observability
P09-P11 kubectl competence → P13 Rancher; P06/P07/P09-P11 → P14 CI image/registry/deploy
R51 + approved platform/cutover choice → P15 Spring on the same platform concepts
~~~

The application arrows express hard sequencing at the named interface, not a requirement to finish all of one discipline before another begins. Platform arrows identify learning order and conditional gates; they do not block unrelated R items. For example, public Next routes can be piloted after their public contracts are stable while unrelated creator/admin backend work continues. Authenticated Next server reads remain gated by the production cookie/session topology. If Keycloak is adopted, its identity contract and the named authority documents must be deliberately updated before P08 or dependent auth migration. Spring work starts only after the Node v1 gate, even if Java learning starts earlier.

## 4. Milestone overview

| Milestone | Result | Main prerequisite | Parallel platform checkpoints |
|---|---|---|---|
| M0 — Baseline and public-content security | Tests are interpretable; video and related public reads obey one visibility policy. | Current repository and standards. | P01 Jest real regression/request tests; P02 existing Compose stack. |
| M1 — Backend v1 reliability | Auth, deletion, stream, economy, service trust, and media/privacy seams have verified behavior. | M0's affected contracts; independent items may overlap. | P03 deeper Jest tests; P04 Keycloak investigation after R06/R07; P06 CI when checks are meaningful. |
| M2 — Backend contracts and vertical slices | Stabilized behavior is expressed as small use cases, DTOs, errors, and parity fixtures. | Corresponding M0/M1 behavior fixes. | P03 contract tests; P05 identity ownership decision; P06 Jenkins CI baseline. |
| M3 — Frontend foundations | Design System runtime and Next shell/locale/theme/data/session foundations exist. | Stable public/API contracts and deployment pilot. | P07 stable images; conditional P08 Keycloak pilot; P09 first Kubernetes subset. |
| M4 — Route migration and bounded redesign | Public, viewing, creator, auth, and economy journeys move incrementally with parity. | M3 and the corresponding backend contract. | P07/P09 smoke tests; conditional P08 session migration. |
| M5 — Minimum Admin Console | Admin can inspect and act on users, streams, and content with backend authority. | Admin authorization, query contracts, and Next foundations. | P10 backend config/secrets/health; P11 multi-service operations where justified. |
| M6 — Creator analytics | Report only supported metrics; add approved measurements deliberately. | Stable stream/economy data and semantics. | P10/P11 operations; P12 observability only for a measured diagnosis need. |
| M7 — AI Creator Assistant | Optional read-only advice, then scoped proposals and policy-gated actions. | M6 truthful data and service authorization. | P11 optional agent workload only when runnable; P12 if cross-service evidence calls for it. |
| M8 — Node v1 completion and freeze | Contract fixtures and critical journeys form a trustworthy behavioral reference. | Prior required capabilities and gates. | P13 Rancher after kubectl; P14 Jenkins image → registry → bounded deployment verification. |
| M9 — Spring Boot/relational v2 | New backend satisfies frozen behavior and cutover evidence. | M8; media DB decoupling; deployment/data plan. | P15 Spring image, Jenkins parity, Kubernetes/Rancher rehearsal if that platform is adopted. |

## 5. Detailed milestone and work-item backlog

### M0 — Baseline and public-content security

**Objective:** Establish a repeatable baseline and close public video metadata/related-read leaks without reorganizing the backend. **Why now:** A frontend or Java implementation cannot safely reuse a public-content contract that admits private records. **Prerequisites:** Current code and four standards. **Work items:** R01-R05. **Learning outcomes:** Request flow, authentication versus authorization, ownership versus visibility, characterization tests. **Exit gate:** Baseline failure classified; anonymous/owner/admin/processing/private matrix passes at HTTP boundaries for the affected reads. **Deferred work:** Broad DDD extraction, private asset delivery mechanism, visual redesign.

**R01 — Classify the failing stream payload test.** **Category:** TEST / OBSERVABILITY.
- **Business purpose:** Make baseline failures meaningful before later stream work.
- **Current behavior to trace:** serializePublicStream HLS URL/heartbeat rule and the test fixture.
- **Files:** backend/src/utils/streamPayload.js; backend/src/utils/__tests__/streamPayload.test.js; backend/src/utils/hlsUrl.js.
- **Engineering concepts:** Characterization, stale data, serializer contract.
- **Dependencies:** None.
- **Suggested implementation boundary:** Decide whether the fixture or expected contract is wrong; change only that test/contract edge after tracing.
- **Tests / verification:** Run the existing backend suite and an explicit fresh versus stale heartbeat case; pair this baseline work with P01's first real Jest regression rather than replacing the runner blindly.
- **Done criteria:** Suite passes for the intended rule and a short note explains the prior failure.
- **Mentor checkpoint:** Explain why an isLive flag and an HLS URL can currently disagree.

**R02 — Enforce video-detail visibility.** **Category:** BUG / HARDENING.
- **Business purpose:** A guessed ID must not expose private video metadata to an anonymous viewer.
- **Current behavior to trace:** GET /api/v1/videos, /api/v1/videos/search, /api/v1/videos/user/:userId, /api/v1/videos/:id, owner update/read, admin list; /api is a temporary alias.
- **Files:** backend/src/routes/VideoRoute.route.js; backend/src/controllers/VideoController.controller.js; backend/src/models/Video.model.js; backend/src/middlewares/Auth.middleware.js; backend/src/routes/AdminRoute.route.js.
- **Engineering concepts:** Authentication, authorization, ownership, visibility predicates, concealment.
- **Dependencies:** R01 only for a clean test baseline; the security fix need not wait for unrelated stream behavior.
- **Suggested implementation boundary:** Define and enforce the public/owner/admin/processing detail matrix at the backend query boundary; preserve the established API shape where possible.
- **Tests / verification:** Jest request-level regression for anonymous private/processing ID, public ID, owner own ID, admin access, missing ID, and list/detail consistency (P01).
- **Done criteria:** Detail and discovery no longer reveal a record forbidden by the agreed matrix; no frontend hiding is counted as protection.
- **Mentor checkpoint:** Explain why a valid ID, a logged-in user, and content visibility are three different facts.

**R03 — Gate comments by parent-video visibility.** **Category:** BUG / HARDENING.
- **Business purpose:** Comments must not reveal or mutate inaccessible video content.
- **Current behavior to trace:** GET/create/like/delete comments and the parent Video lookup, including status changes after comments exist.
- **Files:** backend/src/routes/CommentRoute.route.js; backend/src/controllers/CommentController.controller.js; backend/src/models/Video.model.js.
- **Engineering concepts:** Parent-resource authorization, read/write policy, stale child records.
- **Dependencies:** R02's visibility matrix.
- **Suggested implementation boundary:** Apply the agreed parent policy to each comment operation; avoid a generic policy framework in this fix.
- **Tests / verification:** Anonymous/private/processing/owner/admin combinations for listing and mutations, including a changed parent status.
- **Done criteria:** No comment read or action bypasses the parent rule.
- **Mentor checkpoint:** Explain why checking the comment's own ID does not establish access to its video.

**R04 — Align video reactions and view increments with visibility.** **Category:** BUG / HARDENING.
- **Business purpose:** Likes, dislikes, and views must not provide a write path to hidden content.
- **Current behavior to trace:** PUT /videos/:id/view and POST like/unlike/dislike/undislike; compare their queries to GET detail.
- **Files:** backend/src/routes/VideoRoute.route.js; backend/src/controllers/VideoController.controller.js; backend/src/models/Video.model.js.
- **Engineering concepts:** Command authorization, idempotent user reaction, query consistency.
- **Dependencies:** R02.
- **Suggested implementation boundary:** Reuse the established viewability decision in these commands while retaining each command's existing business rules.
- **Tests / verification:** Hidden/processing/public IDs, anonymous versus authenticated paths, repeated toggle and missing record.
- **Done criteria:** Reaction and view writes cannot target a video the actor is not allowed to interact with.
- **Mentor checkpoint:** Explain why a mutation endpoint needs its own resource check even when the UI hides its button.

**R05 — Check derived clips when source visibility changes.** **Category:** BUG / HARDENING.
- **Business purpose:** A clip must not remain a public route to private source content.
- **Current behavior to trace:** Clip create/list/detail and source Video status edits.
- **Files:** backend/src/routes/ClipRoute.route.js; backend/src/controllers/ClipController.controller.js; backend/src/controllers/VideoController.controller.js; backend/src/models/Video.model.js.
- **Engineering concepts:** Derived-resource visibility, policy propagation, historical records.
- **Dependencies:** R02.
- **Suggested implementation boundary:** Define the source-dependent read rule and enforce it for existing and newly created clips.
- **Tests / verification:** Public source, private source before/after clip creation, processing source, missing source.
- **Done criteria:** Public clip responses cannot expose a source the public cannot view.
- **Mentor checkpoint:** Explain which object owns the visibility decision when a clip points to a video.

### M1 — Backend v1 reliability and trust boundaries

**Objective:** Make existing auth, asset, stream, economy, and cross-service behavior safe and recoverable. **Why now:** These are product invariants that must hold before their code is extracted or reused in Next/Spring. **Prerequisites:** Trace each local path; R02-R05 for related content; no blanket M0 completion requirement for independent flows. **Work items:** R06-R16. **Learning outcomes:** Auth lifecycle, local versus cross-provider transactions, session correlation, replay, failure isolation, integration tests. **Exit gate:** Critical auth, stream, payment and deletion journeys have repeatable tests and an explicit recovery story; private delivery is either enforced or the capability is not claimed as secure. **Deferred work:** Generic DDD framework, new analytics, Java implementation.

**R06 — Harden registration/login OTP lifecycle.** **Category:** BUG / HARDENING.
- **Business purpose:** OTP proof should resist guessing/replay and not turn an uncertain email outcome into an unsafe account transition.
- **Current behavior to trace:** Register → registration OTP; password login → login OTP; verify/resend and cleanup/expiry.
- **Files:** backend/src/routes/UserRoute.route.js; backend/src/controllers/UserController.controller.js; backend/src/models/Otp.model.js; backend/src/utils/createToken.js.
- **Engineering concepts:** Challenge lifecycle, expiry, hashing, rate/attempt limits, atomic consumption, enumeration.
- **Dependencies:** R01 baseline only.
- **Suggested implementation boundary:** First write the current transition table, then harden one challenge type at a time under a shared agreed rule.
- **Tests / verification:** Valid, expired, wrong, replayed, concurrent verify, resend and email failure cases.
- **Done criteria:** Only a valid unused challenge advances its intended flow; failure responses do not leak sensitive proof.
- **Mentor checkpoint:** Explain the difference between knowing a password and proving the second step.

**R07 — Preserve session truth during frontend profile restoration.** **Category:** BUG / HARDENING.
- **Business purpose:** A temporary network/500 failure must not be presented as logout.
- **Current behavior to trace:** Cookie login/profile request, App startup restoration, Redux auth snapshot, logout, OAuth return.
- **Files:** frontend/src/App.tsx; frontend/src/store/slices/authSlice.ts; frontend/src/store/api/userApi.ts; frontend/src/pages/AuthCallback/AuthCallback.tsx; backend/src/middlewares/Auth.middleware.js.
- **Engineering concepts:** Backend authority, client snapshot, 401 versus transport failure, loading/unknown states.
- **Dependencies:** R06 only if OTP response semantics change; otherwise independent.
- **Suggested implementation boundary:** Distinguish unauthenticated, authenticated, and temporarily unknown restoration outcomes without rewriting the whole auth feature.
- **Tests / verification:** 200, 401, 403/disabled, 500, offline, delayed response, logout.
- **Done criteria:** Profile failure caused by network/5xx does not silently clear a valid session; backend remains authority.
- **Mentor checkpoint:** Explain why Redux user data cannot prove that a request is authorized.

**R08 — Make video deletion and provider cleanup recoverable.** **Category:** BUG / HARDENING.
- **Business purpose:** Removing a video must not leave unexplained database/Cloudinary divergence.
- **Current behavior to trace:** Owner/admin deletion, dependent clips/comments, provider asset delete, partial failure and retries.
- **Files:** backend/src/controllers/VideoController.controller.js; backend/src/controllers/AdminController.controller.js; backend/src/models/Video.model.js; backend/src/config/cloudinary.config.js.
- **Engineering concepts:** Local transaction, external side effect, idempotent cleanup, reconciliation.
- **Dependencies:** R02-R05 visibility policy; no DDD extraction prerequisite.
- **Suggested implementation boundary:** Specify durable deletion outcome and retriable cleanup state, then handle one failure seam at a time.
- **Tests / verification:** Unauthorized delete, DB failure, provider failure, retry, duplicate request, dependent records.
- **Done criteria:** Each partial outcome is observable and safely recoverable; response does not claim provider cleanup that failed.
- **Mentor checkpoint:** Explain why a MongoDB transaction cannot atomically delete a Cloudinary asset.

**R09 — Align public LIVE flag and HLS playability.** **Category:** BUG / HARDENING.
- **Business purpose:** Viewers should not be told LIVE when no current playable stream is available.
- **Current behavior to trace:** Publish, heartbeat, liveness sweep, serializePublicStream, discovery and watch payloads.
- **Files:** backend/src/controllers/StreamController.controller.js; backend/src/utils/streamPayload.js; backend/src/service/streamLiveness.service.js; backend/src/utils/__tests__/streamPayload.test.js.
- **Engineering concepts:** State versus observation, stale heartbeat, public DTO invariants.
- **Dependencies:** R01.
- **Suggested implementation boundary:** Agree on public LIVE/readiness states and make current serializer/read paths consistent before broader lifecycle changes.
- **Tests / verification:** Publisher just connected, ready/fresh, stale heartbeat, ended, missing HLS ID; HTTP/socket payload agreement.
- **Done criteria:** Public LIVE and playback URL semantics are consistent with the documented rule.
- **Mentor checkpoint:** Explain why successful ingest is not proof of playable HLS.

**R10 — Introduce active broadcast-session identity.** **Category:** BUG / HARDENING.
- **Business purpose:** Two publishing attempts for one logical stream must be distinguishable.
- **Current behavior to trace:** Backend start/publish and media pre/postPublish, playbackId generation, heartbeat, unpublish and terminate.
- **Files:** backend/src/controllers/StreamController.controller.js; backend/src/models/Stream.model.js; media-service/src/config/mediaServer.config.js; media-service/index.js.
- **Engineering concepts:** Correlation ID, state machine, uniqueness, atomic compare-and-set.
- **Dependencies:** R09's public state definition.
- **Suggested implementation boundary:** Specify the active-session identifier and persistence/DTO ownership; introduce it across one publish path without exposing ingest secrets.
- **Tests / verification:** Consecutive broadcasts and a duplicate publish for the same logical stream.
- **Done criteria:** Every accepted broadcast has an identity distinct from the preceding one and callbacks can name it.
- **Mentor checkpoint:** Explain why stream ID, stream key, playback ID, and active session ID have different jobs.

**R11 — Reject stale media callbacks and reconcile readiness.** **Category:** BUG / HARDENING.
- **Business purpose:** An old unpublish or heartbeat must not end a newer broadcast; public LIVE waits for current HLS readiness.
- **Current behavior to trace:** /streams/internal/publish, /unpublish, /heartbeat; media callback retry/timeout; backend terminate; FFmpeg/HLS startup.
- **Files:** backend/src/routes/StreamRoute.route.js; backend/src/controllers/StreamController.controller.js; backend/src/utils/mediaControl.js; media-service/src/config/mediaServer.config.js; media-service/index.js.
- **Engineering concepts:** Idempotency, replay, ordering, readiness observation, timeout/reconciliation.
- **Dependencies:** R10. Later R15 must honor this callback contract.
- **Suggested implementation boundary:** Correlate each callback and terminate command to the active session; define duplicate/stale responses and a verified readiness transition.
- **Tests / verification:** Old unpublish after new publish, duplicate heartbeat, lost readiness, timeout/retry, failed FFmpeg, delayed termination.
- **Done criteria:** Stale events are harmless; only a verified current session becomes publicly playable.
- **Mentor checkpoint:** Explain how the backend behaves when media succeeds but its callback response is lost.

**R12 — Protect donation atomicity and retry behavior.** **Category:** BUG / HARDENING.
- **Business purpose:** A retry or concurrent donation must not move coins twice or produce a negative balance.
- **Current behavior to trace:** POST /coins/donate, idempotency key, debit/credit/record transaction, post-commit notification/socket.
- **Files:** backend/src/routes/CoinRoute.route.js; backend/src/controllers/CoinController.controller.js; backend/src/models/Donation.model.js; backend/src/models/User.model.js.
- **Engineering concepts:** Database transaction, conditional write, unique key, concurrency, post-commit effects.
- **Dependencies:** R01 baseline.
- **Suggested implementation boundary:** State the ledger invariant and response for replay; harden existing command and its tests before extraction.
- **Tests / verification:** Insufficient balance, concurrent requests, same/different keys, recipient failure, notification failure after commit; use P03 for meaningful Jest concurrency/integration coverage.
- **Done criteria:** One accepted key maps to one durable transfer and repeatable outcome; balance invariant survives concurrency.
- **Mentor checkpoint:** Explain why retry safety and one local DB transaction solve different problems.

**R13 — Reconcile top-up creation and fulfillment.** **Category:** BUG / HARDENING.
- **Business purpose:** Uncertain Stripe/browser/backend outcomes must neither lose a paid purchase nor credit it twice.
- **Current behavior to trace:** POST /coins/topup, Stripe PaymentIntent, pending TopUp, confirm endpoint, signed webhook, balance refresh.
- **Files:** backend/src/routes/CoinRoute.route.js; backend/src/controllers/CoinController.controller.js; backend/src/models/TopUp.model.js; frontend/src/pages/TopUp/TopUp.tsx.
- **Engineering concepts:** Provider authority, webhook replay, idempotent fulfillment, reconciliation, no distributed transaction.
- **Dependencies:** R12 economy invariant; external Stripe test mode/credentials for integration evidence.
- **Suggested implementation boundary:** Identify intent/local-record failure seams, stable payment identity, and a retry-safe reconciliation path; keep Stripe authority separate from backend coin credit.
- **Tests / verification:** Duplicate webhook/confirm, lost local record, delayed provider result, wrong amount/currency/user, concurrent fulfillment.
- **Done criteria:** A verified successful intent is credited at most once and uncertain states have a documented recovery route.
- **Mentor checkpoint:** Explain why Stripe success alone is not proof that coins were credited.

**R14 — Scope internal media and agent authority.** **Category:** BUG / HARDENING.
- **Business purpose:** A service secret must not grant arbitrary creator/admin powers.
- **Current behavior to trace:** x-media-service-secret callbacks; protectOrAgent analytics/announcement/moderation routes and acting-user checks.
- **Files:** backend/src/middlewares/MediaServiceAuth.middleware.js; backend/src/middlewares/Auth.middleware.js; backend/src/controllers/ModerationController.controller.js; backend/src/controllers/NotificationController.controller.js; agent-service/tools/moderation_tools.py.
- **Engineering concepts:** Service principal versus user principal, capability scope, resource authorization, replay.
- **Dependencies:** R10 for media session scope; independent agent route audit can start earlier.
- **Suggested implementation boundary:** Define allowed service operations and required actor/resource proof per route, then close bypasses locally.
- **Tests / verification:** Wrong secret, valid service/wrong resource, inactive actor, unapproved action, valid scoped callback.
- **Done criteria:** Service authentication cannot bypass product ownership or role policy.
- **Mentor checkpoint:** Explain why a trusted process is not automatically an authorized creator.

**R15 — Replace media's direct MongoDB stream-key read.** **Category:** ARCHITECTURE REFACTOR.
- **Business purpose:** Media publishing must survive a product database implementation change without copying User schema.
- **Current behavior to trace:** Media key registry refresh/startup, signed RTMP publish, backend key creation/rotation/revocation.
- **Files:** media-service/src/services/streamKeyRegistry.service.js; media-service/src/config/mediaServer.config.js; backend/src/controllers/StreamController.controller.js; backend/src/models/User.model.js.
- **Engineering concepts:** Backend-owned authorization contract, credential rotation, fail-closed cache, service boundary.
- **Dependencies:** R14 scoped service identity; R10 active-session contract.
- **Suggested implementation boundary:** Choose and verify a backend-controlled publish authorization or credential contract; migrate one ingest path while preserving signed-publish behavior.
- **Tests / verification:** Valid/revoked key, backend unavailable, cache expiry, rotation, restart, no Mongo connection from media.
- **Done criteria:** Media no longer reads product Mongo schema for authorization, and publish behavior has contract tests.
- **Mentor checkpoint:** Explain which system decides publisher permission and which validates RTMP mechanics.

**R16 — Enforce private asset delivery or gate the claim.** **Category:** BUG / HARDENING.
- **Business purpose:** A private video must not be playable by an unauthorized user holding its asset URL.
- **Current behavior to trace:** Video API DTOs, Cloudinary URL exposure, upload and HLS URL delivery, cache behavior.
- **Files:** backend/src/controllers/VideoController.controller.js; backend/src/config/cloudinary.config.js; backend/src/utils/hlsUrl.js; media-service/index.js; frontend/src/pages/WatchVideo/WatchVideo.tsx.
- **Engineering concepts:** Metadata versus byte authorization, signed/protected delivery, URL expiry, CDN cache.
- **Dependencies:** R02; approved provider/media delivery design (external/deployment decision).
- **Suggested implementation boundary:** Prove the asset threat with a known URL, choose an approved protected delivery mechanism, and do not describe private playback as secure until it passes.
- **Tests / verification:** Anonymous known URL, owner URL, expired/revoked access, cached playlist/segment or Cloudinary asset.
- **Done criteria:** Unauthorized byte consumption is blocked, or the private-media capability is explicitly withheld from completion claims.
- **Mentor checkpoint:** Explain why hiding a link and filtering an API response do not revoke a known asset URL.

### M2 — Backend contracts and incremental vertical slices

**Objective:** Express stable behavior through small application/domain/infrastructure boundaries without rewriting the backend at once. **Why now:** Behavior fixes supply a safe reference for extraction, while stable DTO/error contracts let new clients avoid Mongoose coupling. **Prerequisites:** The corresponding M0/M1 flow is corrected and covered before its extraction. **Work items:** R17-R25. **Learning outcomes:** Commands versus queries, use-case boundaries, domain invariants, repository adapters, application errors and contract tests. **Exit gate:** Five selected slices have thin controllers, explicit boundaries and unchanged verified behavior; API/event fixtures cover critical consumers. **Deferred work:** Generic repository framework, a project-wide folder move, Spring implementation.

**R17 — Extract GetViewableVideo query.** **Category:** ARCHITECTURE REFACTOR.
- **Business purpose:** Give video detail one reusable, testable viewability decision and DTO boundary.
- **Current behavior to trace:** Public/owner/admin video detail after R02, and related reads after R03-R05.
- **Files:** backend/src/controllers/VideoController.controller.js; backend/src/models/Video.model.js; backend/src/routes/VideoRoute.route.js.
- **Engineering concepts:** Query use case, policy, repository seam, controller as transport.
- **Dependencies:** R02-R05.
- **Suggested implementation boundary:** Move the validated detail decision into one application query; keep persistence-specific query details behind its local adapter.
- **Tests / verification:** Existing HTTP matrix plus direct query tests for missing/forbidden/visible records.
- **Done criteria:** Controller delegates; response and visibility semantics match the stabilized contract.
- **Mentor checkpoint:** Explain why a query can enforce policy without becoming the route or the Mongoose model.

**R18 — Extract DonateCoins command.** **Category:** ARCHITECTURE REFACTOR.
- **Business purpose:** Make the money-moving invariant visible and testable outside HTTP wiring.
- **Current behavior to trace:** Stabilized donation transaction, idempotency key, and post-commit notification.
- **Files:** backend/src/controllers/CoinController.controller.js; backend/src/models/Donation.model.js; backend/src/models/User.model.js; backend/src/controllers/NotificationController.controller.js.
- **Engineering concepts:** Command, unit of work, concurrency, idempotency, post-commit effect.
- **Dependencies:** R12; R17 as the simpler vertical-slice learning step.
- **Suggested implementation boundary:** Extract one command with explicit input/result/errors and narrow persistence/effect ports; preserve atomic debit-credit-record.
- **Tests / verification:** Command tests plus HTTP and concurrent persistence cases from R12.
- **Done criteria:** Controller only translates request/result; duplicate and balance behavior remain unchanged.
- **Mentor checkpoint:** Identify the transaction boundary and what happens if notification fails after commit.

**R19 — Extract CompleteTopUp command.** **Category:** ARCHITECTURE REFACTOR.
- **Business purpose:** Keep provider verification and coin fulfillment consistent across confirm and webhook entry points.
- **Current behavior to trace:** TopUp lookup, Stripe status/attributes, conditional claim and balance credit.
- **Files:** backend/src/controllers/CoinController.controller.js; backend/src/models/TopUp.model.js; backend/src/routes/CoinRoute.route.js.
- **Engineering concepts:** External provider adapter, replay-safe command, local transaction, reconciliation.
- **Dependencies:** R13; R18 for the economy command pattern.
- **Suggested implementation boundary:** Route both verified completion paths into one application command without moving Stripe authority into the domain model.
- **Tests / verification:** Same intent through both entry points, duplicate events, mismatched amount/currency, DB uncertainty.
- **Done criteria:** One verified payment identity leads to at most one credit, independent of entry path.
- **Mentor checkpoint:** Explain which facts come from Stripe and which are decided/stored by OmexLive.

**R20 — Extract PublishStream / EndStream lifecycle commands.** **Category:** ARCHITECTURE REFACTOR.
- **Business purpose:** Keep stream transitions and media effects coherent across creator, media and admin paths.
- **Current behavior to trace:** Start/publish/readiness/heartbeat/unpublish/end/terminate and stale sweep after R09-R11.
- **Files:** backend/src/controllers/StreamController.controller.js; backend/src/service/streamLiveness.service.js; backend/src/models/Stream.model.js; backend/src/utils/mediaControl.js.
- **Engineering concepts:** State machine, command preconditions, session compare-and-set, external effect.
- **Dependencies:** R09-R11, R14; media authorization contract from R15 for final integration.
- **Suggested implementation boundary:** Extract one transition at a time behind a tested lifecycle contract; retain distinct creator/media/admin actor scopes.
- **Tests / verification:** Legal/illegal transitions, duplicate and stale callbacks, timeout and media failure.
- **Done criteria:** Transition ownership is explicit; controllers and timers call the same policy without changing public semantics.
- **Mentor checkpoint:** Explain which transition is durable before a media-side action can be considered complete.

**R21 — Extract BanUser privileged use case.** **Category:** ARCHITECTURE REFACTOR.
- **Business purpose:** One admin action should consistently disable account access and handle active sessions/streams.
- **Current behavior to trace:** Admin ban/role routes, HTTP/socket account checks, active stream termination.
- **Files:** backend/src/controllers/AdminController.controller.js; backend/src/routes/AdminRoute.route.js; backend/src/middlewares/Admin.middleware.js; backend/src/sockets/auth.socket.js; backend/src/utils/mediaControl.js.
- **Engineering concepts:** Privileged command, account state, cross-module coordination, best-effort side effects.
- **Dependencies:** R07, R14, R20.
- **Suggested implementation boundary:** Move the existing ban decision into one application command with explicit durable state and follow-up effects.
- **Tests / verification:** Admin/non-admin, self/target policy, active socket, active stream, media failure, repeated ban/unban.
- **Done criteria:** HTTP and socket authorization reflect the durable ban, and partial termination is observable.
- **Mentor checkpoint:** Explain why UI role checks and a service secret cannot authorize a ban.

**R22 — Introduce structured application errors in one slice.** **Category:** ARCHITECTURE REFACTOR.
- **Business purpose:** Clients need stable error meanings rather than parsing arbitrary messages.
- **Current behavior to trace:** One stabilized video or economy controller's async errors, HTTP status and frontend handling.
- **Files:** backend/src/controllers/VideoController.controller.js; backend/src/controllers/CoinController.controller.js; backend/index.js; frontend/src/config/api.ts.
- **Engineering concepts:** Domain/application error, transport mapping, field errors, safe diagnostics.
- **Dependencies:** R17 or R18; choose one vertical slice.
- **Suggested implementation boundary:** Define a small error vocabulary and map only the chosen slice end to end; expand as later slices move.
- **Tests / verification:** 400/401/403/404/409/5xx mapping, stable code, no secrets in responses.
- **Done criteria:** The selected slice emits a documented error contract without changing unrelated routes.
- **Mentor checkpoint:** Explain why a domain conflict and a network failure should not become the same UI error.

**R23 — Isolate one public DTO from Mongoose shapes.** **Category:** ARCHITECTURE REFACTOR.
- **Business purpose:** A future Java persistence change should not force presentation rewrites.
- **Current behavior to trace:** Stream/video public serializer, populated-or-ID relationships, frontend types and metadata consumers.
- **Files:** backend/src/utils/streamPayload.js; backend/src/controllers/VideoController.controller.js; frontend/src/types/index.ts; frontend/src/store/api/videoApi.ts.
- **Engineering concepts:** DTO, opaque ID, adapter, API version semantics.
- **Dependencies:** R17 and R22; R09 for stream DTO if chosen.
- **Suggested implementation boundary:** Start with one public resource contract; map persistence fields at the backend boundary and record its fixture.
- **Tests / verification:** Populated/unpopulated relation, null/absent fields, timestamp, visibility, frontend consumer fixture.
- **Done criteria:** Chosen public DTO no longer exposes persistence-only shape by accident.
- **Mentor checkpoint:** Explain why renaming _id alone does not make a contract persistence-independent.

**R24 — Retire or reconcile legacy donation/payment paths.** **Category:** LEGACY / CLEANUP.
- **Business purpose:** Unused or divergent economy paths must not cause accidental duplicate flows.
- **Current behavior to trace:** Mounted /coins endpoints, old DonateRoute, frontend donationApi registration/usage and fallback URL.
- **Files:** backend/src/routes/CoinRoute.route.js; backend/src/routes/DonateRoute.route.js; backend/index.js; frontend/src/store/api/donationApi.ts; frontend/src/store/store.ts.
- **Engineering concepts:** Consumer inventory, compatibility alias, route retirement, dead-code proof.
- **Dependencies:** R12-R13 and R18-R19; inventory actual consumers before deletion.
- **Suggested implementation boundary:** Document live callers, reconcile one path at a time, and remove only proven-unused code.
- **Tests / verification:** Route inventory, HTTP contract for active paths, frontend call-site search, payment/donation E2E smoke.
- **Done criteria:** One documented economy path per operation; no active client loses compatibility.
- **Mentor checkpoint:** Explain what evidence is sufficient to retire an API route safely.

**R25 — Capture critical Node contract and integration fixtures.** **Category:** TEST / OBSERVABILITY.
- **Business purpose:** Next and Spring need a behavioral reference stronger than controller source code.
- **Current behavior to trace:** Public video, auth, stream/media, donation/top-up, admin, Socket event contracts.
- **Files:** backend/src/routes; backend/src/sockets/index.js; backend/src/utils/__tests__; frontend/src/store/api; media-service/src/config/mediaServer.config.js.
- **Engineering concepts:** Request contract, callback/event fixture, test pyramid, consumer compatibility.
- **Dependencies:** R17-R24 for the affected contracts; add fixtures incrementally as those items finish.
- **Suggested implementation boundary:** Record representative successful and failure requests/events, visibility rules, replay behavior and stable codes, without snapshotting secrets.
- **Tests / verification:** Run fixtures against Node v1 and real/contract provider adapters where meaningful; P03 can carry Jest contract fixtures without forcing all tests into one runner.
- **Done criteria:** Each critical boundary has an executable or machine-checkable fixture and a named owner.
- **Mentor checkpoint:** Explain which behavior must remain identical in Spring and which implementation detail may change.

### M3 — Design System and Next.js foundations

**Objective:** Provide a small Next App Router platform that consumes the approved Design System and can host one route safely. **Why now:** Route migration needs a stable locale, theme, API/state and rendering shell; broad visual work needs tokens first. **Prerequisites:** Stable public DTO/error contract for the pilot; host/session choice for authenticated server reads. **Work items:** R26-R33. **Learning outcomes:** Server/Client boundaries, localization, state ownership, RTK Query, CSS tokens, accessibility and public metadata. **Exit gate:** A public pilot loads in vi/en and light/dark with no hydration mismatch; auth/session and deployment limits are documented. **Deferred work:** Moving every route, final font/logo decision, broad Quiet Broadcast redesign.

**R26 — Implement semantic tokens and foundation styles.** **Category:** DESIGN SYSTEM.
- **Business purpose:** New screens need one Quiet Broadcast color, spacing, type-role and motion vocabulary.
- **Current behavior to trace:** Existing global CSS/theme variables and [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) semantic roles.
- **Files:** frontend/src/index.css; frontend/src/styles/responsive.css; DESIGN_SYSTEM.md.
- **Engineering concepts:** Primitive versus semantic tokens, contrast, theme, reduced motion.
- **Dependencies:** None from DDD; Design System decision status remains authoritative.
- **Suggested implementation boundary:** Add only portable token/theme/reset foundations in the new frontend; keep candidate font and exact widths provisional.
- **Tests / verification:** Light/dark contrast on representative controls, Vietnamese diacritics, reduced motion and first paint.
- **Done criteria:** Components can consume semantic tokens without raw feature colors.
- **Mentor checkpoint:** Explain why red is reserved for LIVE/Go Live and why feedback danger is a separate role.

**R27 — Build only the primitives needed by the first route.** **Category:** DESIGN SYSTEM.
- **Business purpose:** Shared controls should have one accessible interaction contract.
- **Current behavior to trace:** Repeated controls in the current header/discovery and the Button, Badge, Tabs, Dialog contracts in DESIGN_SYSTEM.md.
- **Files:** frontend/src/layout/Header; frontend/src/pages/Home; DESIGN_SYSTEM.md.
- **Engineering concepts:** Native semantics, focus, hit targets, composition, content resilience.
- **Dependencies:** R26; choose the first route's actual needs.
- **Suggested implementation boundary:** Implement a narrow shared/ui set and its states; add Dialog only when a route requires it, preserving its focus/escape/return contract.
- **Tests / verification:** Keyboard/focus, loading/disabled, vi/en expansion, 320–390px and touch targets.
- **Done criteria:** First route uses a documented primitive rather than a duplicate; no speculative variant catalog.
- **Mentor checkpoint:** Explain what belongs in a primitive versus a product StreamCard.

**R28 — Establish Next App Router and app/[locale] shell.** **Category:** MIGRATION.
- **Business purpose:** A new route can be rendered under stable vi/en URLs without disturbing the Vite app.
- **Current behavior to trace:** React Router paths, shell, current deep links, build/ingress configuration.
- **Files:** frontend/src/App.tsx; frontend/src/main.tsx; frontend/nginx.conf; docker-compose.yml; FRONTEND_STANDARDS.md.
- **Engineering concepts:** App Router, layouts, route groups, Server Components, URL ownership.
- **Dependencies:** R23/R25 pilot contract; approved preview or gateway route ownership.
- **Suggested implementation boundary:** Create a parallel shell and one low-risk public pilot; preserve stable resource path segments and legacy links.
- **Tests / verification:** Direct load, reload, not-found, old deep link, vi/en prefix, no competing path ownership.
- **Done criteria:** Pilot route is reachable without changing production route traffic accidentally.
- **Mentor checkpoint:** Explain why a route group changes layout organization but not the URL.

**R29 — Add runtime vi/en translation and navigation rules.** **Category:** MIGRATION.
- **Business purpose:** Users can change language without losing the resource or action they are using.
- **Current behavior to trace:** Existing hardcoded copy, links, auth/payment returns and route params.
- **Files:** frontend/src/App.tsx; frontend/src/layout/Header; frontend/src/pages/AuthCallback/AuthCallback.tsx; FRONTEND_STANDARDS.md; DESIGN_SYSTEM.md.
- **Engineering concepts:** URL locale authority, feature-owned messages, Intl, runtime switch, content expansion.
- **Dependencies:** R28.
- **Suggested implementation boundary:** Implement common messages, one pilot feature resource, prefixed link helper, and server-readable locale preference.
- **Tests / verification:** vi/en first response, explicit URL wins, switch preserves ID/query/hash/focus, expanded tabs/navigation.
- **Done criteria:** Pilot page and accessible names switch at runtime without state/action loss.
- **Mentor checkpoint:** Explain why locale persistence does not override an explicit /en or /vi URL.

**R30 — Establish theme source and hydration behavior.** **Category:** MIGRATION.
- **Business purpose:** Light/dark/system choice should render consistently before interaction.
- **Current behavior to trace:** Existing theme state and CSS, header toggle, first-load behavior.
- **Files:** frontend/src/App.tsx; frontend/src/layout/Header; frontend/src/index.css; DESIGN_SYSTEM.md.
- **Engineering concepts:** Server-visible preference, CSS color-scheme, hydration, system changes.
- **Dependencies:** R26, R28.
- **Suggested implementation boundary:** Choose a validated preference source and apply semantic tokens at the document shell.
- **Tests / verification:** First load, reload, navigation, locale switch, system preference change, no flash/mismatch.
- **Done criteria:** Theme is stable across initial render and client hydration.
- **Mentor checkpoint:** Explain why client-only localStorage cannot determine server-rendered first paint.

**R31 — Set shared API and Redux/RTK Query composition.** **Category:** MIGRATION.
- **Business purpose:** New features need typed transport and one explicit ongoing freshness owner per view.
- **Current behavior to trace:** Existing RTK Query slices, store registration, Axios upload path, credentials and error handling.
- **Files:** frontend/src/store/store.ts; frontend/src/store/api/userApi.ts; frontend/src/config/api.ts; frontend/src/utils/axios.ts; FRONTEND_STANDARDS.md.
- **Engineering concepts:** Server fetch versus client cache, RTK Query invalidation, request-scoped store, transport boundary.
- **Dependencies:** R22-R25 for selected endpoint contracts; R28.
- **Suggested implementation boundary:** Keep reusable baseApi infrastructure under shared/api/baseApi if adopted; feature/product modules own and inject endpoints; store/ registers reducer/middleware and other state. Thin app/ routes compose features and product presentation. Typed Client Component hooks may come from narrow store/hooks.
- **Tests / verification:** One pilot query/mutation, credentials, 401/5xx distinction, cache invalidation, no server-global store or feature → store → feature cycle.
- **Done criteria:** Pilot has one freshness owner and no endpoint module imports the runtime store.
- **Mentor checkpoint:** Explain why shared/api/baseApi and store/ have different responsibilities.

**R32 — Establish auth restoration for Next client boundaries.** **Category:** MIGRATION.
- **Business purpose:** Migrated protected journeys should preserve current login/OAuth/logout UX without treating client state as authority.
- **Current behavior to trace:** R07-restored Vite flow, cookie, profile endpoint, protected route and OAuth callback.
- **Files:** frontend/src/App.tsx; frontend/src/routes/ProtectedRoute.tsx; frontend/src/store/api/userApi.ts; frontend/src/pages/AuthCallback/AuthCallback.tsx; backend/src/utils/createToken.js.
- **Engineering concepts:** HTTP-only cookie, client session snapshot, protected-route UX, 401/403/offline.
- **Dependencies:** R07, R28-R31; authenticated Server Component reads additionally need approved host/cookie topology. If P05 adopts Keycloak, P08 and deliberate authority-document updates precede identity integration.
- **Suggested implementation boundary:** Migrate session restoration as a small Client Component/provider under the approved identity contract; use server reads only when the topology actually supplies the session.
- **Tests / verification:** Login/OTP/OAuth, reload, expiry, inactive account, 500/offline, logout and redirect across locales.
- **Done criteria:** Protected UX preserves behavior and cannot leak personalized server output between users.
- **Mentor checkpoint:** Explain how the backend proves auth while the frontend only displays a snapshot.

**R33 — Pilot public metadata and route deployment contract.** **Category:** MIGRATION.
- **Business purpose:** Public pages need safe share metadata and a route-level rollback path.
- **Current behavior to trace:** Current public video/stream visibility and Vite deep links; Nginx/Compose ingress.
- **Files:** frontend/nginx.conf; docker-compose.yml; frontend/src/App.tsx; backend/src/controllers/VideoController.controller.js; backend/src/controllers/StreamController.controller.js.
- **Engineering concepts:** SEO visibility, canonical/locale alternatives, gateway ownership, cache isolation, rollback.
- **Dependencies:** R02, R09, R23, R28-R29; deployment topology approval.
- **Suggested implementation boundary:** Test metadata for one approved public resource and a bounded preview/traffic split; no private or stale LIVE metadata.
- **Tests / verification:** Public/private/not-found metadata, vi/en canonical URLs, direct reload, OAuth/cookie/socket paths under chosen ingress.
- **Done criteria:** Pilot can be enabled and rolled back by route with no conflicting owner.
- **Mentor checkpoint:** Explain why a resource's API visibility and share metadata must use the same policy.

### M4 — Route-by-route frontend migration and bounded redesign

**Objective:** Replace Vite routes with Next equivalents one journey at a time while preserving behavior and applying Quiet Broadcast within each migrated screen. **Why now:** The shell, Design System, localization and data boundaries now exist; a route can be tested and rolled back independently. **Prerequisites:** M3 and the backend contract for each route. **Work items:** R34-R40. **Learning outcomes:** Server/Client composition, state ownership, realtime/media cleanup, payment client boundaries, responsive visual review. **Exit gate:** Each migrated critical journey passes vi/en, keyboard, theme, compact-width, auth and failure checks applicable to it; legacy route ownership is retired deliberately. **Deferred work:** Spring switch and a single all-screen redesign release.

**R34 — Migrate discovery and search.** **Category:** MIGRATION.
- **Business purpose:** Public visitors can discover playable content with stable URLs and filters.
- **Current behavior to trace:** /home, /live, /game and /search list reads, query parameters, loading/empty states.
- **Files:** frontend/src/pages/Home/Home.tsx; frontend/src/pages/Search/Search.tsx; frontend/src/App.tsx; frontend/src/store/api/videoApi.ts.
- **Engineering concepts:** Server initial read, URL state, client freshness owner, public metadata, responsive grid.
- **Dependencies:** R02, R09, R23, R26-R31, R33.
- **Suggested implementation boundary:** Move one public route at a time; preserve filters/links, then apply tokens and content-first composition on that route.
- **Tests / verification:** Deep link/query reload, vi/en expansion, public-only results, stale LIVE, light/dark and compact widths.
- **Done criteria:** Route parity and bounded redesign are reviewed before its Vite path is retired.
- **Mentor checkpoint:** Explain when the server fetch owns a view and when RTK Query takes over.

**R35 — Migrate video detail and channel/profile public views.** **Category:** MIGRATION.
- **Business purpose:** Viewers can open public media and creators without leaking private content.
- **Current behavior to trace:** WatchVideo API calls, comments/reactions/clips and Channel/Profile public reads.
- **Files:** frontend/src/pages/WatchVideo/WatchVideo.tsx; frontend/src/pages/Channel/Channel.tsx; frontend/src/store/api/videoApi.ts; backend/src/routes/VideoRoute.route.js.
- **Engineering concepts:** Visibility contract, Client Component islands, player lifecycle, public SEO.
- **Dependencies:** R02-R05, R16 for any private playback claim, R17, R23, R28-R31.
- **Suggested implementation boundary:** Migrate public detail first, then dependent interactions; apply Quiet Broadcast media hierarchy within the bounded route.
- **Tests / verification:** Anonymous public/private/processing IDs, owner access, comments, reactions, clips, media errors, metadata.
- **Done criteria:** Route respects backend visibility and handles unavailable/private assets without exposing data.
- **Mentor checkpoint:** Explain why server-rendered metadata and client playback must agree on viewability.

**R36 — Migrate live watch, Socket.IO and HLS player.** **Category:** MIGRATION.
- **Business purpose:** Live viewers keep playback, chat, reactions and reconnect behavior during framework change.
- **Current behavior to trace:** WatchLive mount, socket room join/leave, Hls.js/Plyr setup, status polling and stream changes.
- **Files:** frontend/src/pages/WatchLive/WatchLive.tsx; frontend/src/pages/WatchLive/hooks/useLiveStreamSocket.ts; frontend/src/pages/WatchLive/VideoPlayer/VideoPlayer.tsx; frontend/src/utils/socket.ts.
- **Engineering concepts:** Client island, Socket.IO subscription ownership, HLS recovery, cleanup, event/query reconciliation.
- **Dependencies:** R09-R11, R20, R28-R31, approved media/CORS ingress.
- **Suggested implementation boundary:** Keep the route shell server-renderable; move only playback/realtime work into a feature client boundary with explicit teardown.
- **Tests / verification:** Rapid stream switch, Strict Mode remount, reconnect/rejoin, anonymous viewing, ended/not-ready stream, native/Hls.js paths.
- **Done criteria:** No duplicate socket listeners or stale player instance; public LIVE agrees with playable status.
- **Mentor checkpoint:** Explain which state is ephemeral socket data and which must be re-queried from backend.

**R37 — Migrate auth, OAuth callback and owner profile UX.** **Category:** MIGRATION.
- **Business purpose:** Users can register, sign in, return from OAuth and maintain session UX on locale URLs.
- **Current behavior to trace:** Login/Register OTP forms, AuthCallback, ProtectedRoute, profile restore and logout.
- **Files:** frontend/src/components/Login/Login.tsx; frontend/src/components/Register/Register.tsx; frontend/src/pages/AuthCallback/AuthCallback.tsx; frontend/src/routes/ProtectedRoute.tsx; frontend/src/store/api/userApi.ts.
- **Engineering concepts:** Cookie session, multistep form state, callback URL, 401/403 versus offline, locale redirect.
- **Dependencies:** R06-R07, R28-R32; approved host/cookie topology for authenticated SSR. A Keycloak path also depends on P05/P08 and updated authorities.
- **Suggested implementation boundary:** Migrate one auth journey then protected profile entry; maintain client restoration where server cookie access is unavailable.
- **Tests / verification:** Password/OTP, Google return, expired/inactive account, 500/offline, reload, logout, vi/en redirect.
- **Done criteria:** Existing auth behavior works under the chosen topology without exposing JWT to JavaScript.
- **Mentor checkpoint:** Explain how Google and password flows both end in the backend's OmexLive session.

**R38 — Migrate creator controls and upload.** **Category:** MIGRATION.
- **Business purpose:** Creators can prepare/publish/manage streams and upload videos without losing drafts or keys.
- **Current behavior to trace:** CreatorLive, GoLiveModal, UploadVideo, backend start/end, multipart progress/retry.
- **Files:** frontend/src/pages/CreatorLive/CreatorLive.tsx; frontend/src/components/GoLiveModal/GoLiveModal.tsx; frontend/src/components/UploadVideo/UploadVideo.tsx; frontend/src/utils/axios.ts.
- **Engineering concepts:** Client-only file APIs, multipart progress, credential secrecy, command retries, cache invalidation.
- **Dependencies:** R08-R11, R20, R28-R32, R37.
- **Suggested implementation boundary:** Move stream controls and upload as separate feature boundaries/commits; compose shared UI without moving business logic into primitives.
- **Tests / verification:** Start/end, stale status, key display, upload progress/cancel/retry, response failure, route change with draft.
- **Done criteria:** Creator actions preserve their backend effects and failure recovery across migration.
- **Mentor checkpoint:** Explain why a stream key and a public playback ID must never share the same UI contract.

**R39 — Migrate top-up and donation UX.** **Category:** MIGRATION.
- **Business purpose:** Users can pay or donate safely across reloads, redirects and uncertain responses.
- **Current behavior to trace:** Stripe Elements TopUp, donation modal, balance and history refresh.
- **Files:** frontend/src/pages/TopUp/TopUp.tsx; frontend/src/pages/WatchLive/DonateModal/DonateModal.tsx; frontend/src/store/api/coinApi.ts; backend/src/routes/CoinRoute.route.js.
- **Engineering concepts:** Client-only Stripe Elements, idempotency key, backend confirmation, RTK Query invalidation.
- **Dependencies:** R12-R13, R18-R19, R24, R28-R32, R37.
- **Suggested implementation boundary:** Migrate donation and top-up separately; each keeps pending identity and verifies backend result before success UI.
- **Tests / verification:** Duplicate submit, redirect return, uncertain result, insufficient balance, backend confirmation delay, vi/en copy.
- **Done criteria:** Neither journey claims completed coins from client-only signals or repeats a charge/transfer on retry.
- **Mentor checkpoint:** Explain the difference between payment confirmation, coin fulfillment and cached balance.

**R40 — Validate and refine Quiet Broadcast per populated route.** **Category:** DESIGN SYSTEM.
- **Business purpose:** The product should be content-led and usable across real media and translated copy.
- **Current behavior to trace:** Newly migrated discovery, viewing, creator and form screens against DESIGN_SYSTEM.md.
- **Files:** DESIGN_SYSTEM.md; frontend/src/index.css; frontend/src/styles/responsive.css; frontend/src/pages/Home/Home.tsx; frontend/src/pages/WatchLive/WatchLive.tsx.
- **Engineering concepts:** Design token governance, responsive composition, contrast over media, content resilience.
- **Dependencies:** R26-R27 and at least one migrated route R34-R39; repeat per route rather than one global redesign diff.
- **Suggested implementation boundary:** Validate populated screens and revise only the bounded route/components; keep exact breakpoints/widths and font family provisional until evidence/decision.
- **Tests / verification:** Real varied thumbnails, vi/en, 320–390px, zoom, light/dark, focus, reduced motion.
- **Done criteria:** Each reviewed route meets Quiet Broadcast and accessibility contracts without decorative card/glow inflation.
- **Mentor checkpoint:** Explain which visual rule is locked and which width/font choice still needs validation.

### M5 — Minimum Admin Console

**Objective:** An authorized admin can inspect platform status and act on users, streams and videos using backend-enforced policies. **Why now:** Existing endpoints provide a base, but useful search/detail and safe operations need stable backend contracts before UI expansion. **Prerequisites:** R21 privileged use case, R22-R25 contracts, Next protected shell. **Work items:** R41-R43. **Learning outcomes:** Admin authorization, query/filter contracts, operational side effects, dense accessible UI. **Exit gate:** Basic dashboard/stats, users list/search/filter/detail/ban/role/live state, streams list/status/creator/terminate/basic moderation, and content browse/search/metadata/remove work end to end. **Deferred work:** Economy administration and advanced BI unless a product requirement justifies them.

**R41 — Complete admin user query/action contract.** **Category:** PRODUCT CAPABILITY.
- **Business purpose:** Admins can find a user, inspect context and make a justified account decision.
- **Current behavior to trace:** GET /admin/stats and /users, role/ban mutations, active stream lookup, auth/sockets.
- **Files:** backend/src/routes/AdminRoute.route.js; backend/src/controllers/AdminController.controller.js; backend/src/models/User.model.js; backend/src/middlewares/Admin.middleware.js.
- **Engineering concepts:** Privileged read, pagination/search/filter, DTO, auditability, live-state derivation.
- **Dependencies:** R07, R21-R23, R25.
- **Suggested implementation boundary:** Add the smallest missing list/detail/filter contract and make ban/role result observable; avoid building a generic admin query framework.
- **Tests / verification:** Non-admin denial, search/filter/pagination, inactive/live user detail, role/ban side effects.
- **Done criteria:** Backend supplies the requested user data/actions without exposing secrets or trusting UI role checks.
- **Mentor checkpoint:** Explain why the admin list and a user profile may need different DTOs.

**R42 — Complete admin stream/content query and action contract.** **Category:** PRODUCT CAPABILITY.
- **Business purpose:** Admins can identify and end a harmful stream or remove harmful video with context.
- **Current behavior to trace:** Existing /admin/streams, /admin/videos, end/delete actions and watch/moderation paths.
- **Files:** backend/src/routes/AdminRoute.route.js; backend/src/controllers/AdminController.controller.js; backend/src/controllers/StreamController.controller.js; backend/src/controllers/VideoController.controller.js.
- **Engineering concepts:** Admin-scoped query, status/creator metadata, session-specific termination, deletion recovery.
- **Dependencies:** R08-R11, R20-R23, R25.
- **Suggested implementation boundary:** Add bounded search/filter/detail where missing; route terminate/remove through stabilized lifecycle and deletion behavior.
- **Tests / verification:** Admin/non-admin, creator/status filters, stale session, media failure, repeat delete, basic moderation.
- **Done criteria:** Admin actions use backend authority and report partial external effects accurately.
- **Mentor checkpoint:** Explain why ending a stream and terminating its media process can have different outcomes.

**R43 — Build the Next admin console in bounded tabs.** **Category:** PRODUCT CAPABILITY.
- **Business purpose:** Admins can use the verified capabilities efficiently and accessibly.
- **Current behavior to trace:** Existing StatsTab, UsersTab, StreamsTab, VideosTab, Admin RTK queries and route guard.
- **Files:** frontend/src/pages/Admin/Admin.tsx; frontend/src/pages/Admin/StatsTab/StatsTab.tsx; frontend/src/pages/Admin/UsersTab/UsersTab.tsx; frontend/src/pages/Admin/StreamsTab/StreamsTab.tsx; frontend/src/pages/Admin/VideosTab/VideosTab.tsx; frontend/src/store/api/adminApi.ts.
- **Engineering concepts:** Server/Client boundary, RTK Query ownership, table semantics, confirmation and recovery.
- **Dependencies:** R31-R32, R37, R40-R42.
- **Suggested implementation boundary:** Migrate dashboard, users, streams, content as separate reviewable UI slices using shared primitives and route-specific product controls.
- **Tests / verification:** 403, stale role, search/filter, action confirmation, mutation refresh, vi/en expansion, compact table overflow.
- **Done criteria:** Minimum console scope is usable in both locales and only backend-approved actions succeed.
- **Mentor checkpoint:** Explain why hiding the Admin link is UX rather than authorization.

### M6 — Creator analytics foundation

**Objective:** Creator metrics accurately describe available observations and any new measurement has a deliberate telemetry contract. **Why now:** Advice is unsafe when labels imply data the system never recorded. **Prerequisites:** Stable stream/economy event semantics and creator access policy. **Work items:** R44-R46. **Learning outcomes:** Metric definition, provenance, sampling bias, aggregation, data retention. **Exit gate:** Every shipped metric has a definition/source/test; unavailable measures are absent or clearly labeled; approved improvements have representative fixtures. **Deferred work:** AI advice based on invented retention/watch-time data.

**R44 — Correct and document available-now metrics.** **Category:** BUG / HARDENING.
- **Business purpose:** Creators should not mistake average peak viewers for average concurrent audience.
- **Current behavior to trace:** buildStreamAnalytics limit/sampling, Stream fields, donation/follow/video counters and Dashboard labels.
- **Files:** backend/src/utils/streamAnalytics.js; backend/src/models/Stream.model.js; backend/src/controllers/StreamController.controller.js; frontend/src/pages/Dashboard/Dashboard.tsx.
- **Engineering concepts:** Metric definition, sample bias, denominator, time window, API compatibility.
- **Dependencies:** R09-R11 for live semantics; R23/R25 contract discipline.
- **Suggested implementation boundary:** Inventory each metric, rename/relabel or redefine only with recorded evidence, and document time windows/limits.
- **Tests / verification:** Empty/small/over-100 stream history, peak versus average examples, creator authorization, vi/en copy.
- **Done criteria:** No displayed metric claims retention, watch time or per-minute concurrency from absent data.
- **Mentor checkpoint:** Derive the current avgViewers number and explain what it does not measure.

**R45 — Improve analytics using existing trustworthy data.** **Category:** PRODUCT CAPABILITY.
- **Business purpose:** Give creators useful history/trend context without premature new telemetry.
- **Current behavior to trace:** Completed-stream duration, peak, donation totals and dashboard data reads.
- **Files:** backend/src/utils/streamAnalytics.js; backend/src/models/Donation.model.js; backend/src/models/Stream.model.js; frontend/src/pages/Dashboard/Dashboard.tsx.
- **Engineering concepts:** Query window, aggregation, pagination, uncertainty/late events, DTO.
- **Dependencies:** R44 and verified economy/stream records R11-R13.
- **Suggested implementation boundary:** Add one explicitly defined metric or history view at a time, with backend calculation and localized UI label.
- **Tests / verification:** Boundary dates/time zones, empty history, pagination/window, known fixture totals and source agreement.
- **Done criteria:** Added metric has a written definition and repeatable source-to-UI test.
- **Mentor checkpoint:** Explain which durable records support the new metric and which audience behavior remains unknown.

**R46 — Add new telemetry only for approved questions.** **Category:** PRODUCT CAPABILITY.
- **Business purpose:** Future retention/watch-time/concurrency claims require real observations and a retention policy.
- **Current behavior to trace:** Socket presence expiry, stream snapshots, absence of durable watch events.
- **Files:** backend/src/sockets/presence.store.js; backend/src/models/Stream.model.js; backend/src/utils/streamAnalytics.js; ARCHITECTURE.md.
- **Engineering concepts:** Event schema, privacy, sampling, aggregation, retention, cost.
- **Dependencies:** R44-R45 and a PRODUCT DECISION on exact creator questions/retention.
- **Suggested implementation boundary:** Specify one metric and its collection/aggregation contract before selecting storage; treat this as optional until approved.
- **Tests / verification:** Event loss/duplicates, multi-tab viewing, clock skew, aggregation fixture and deletion/retention behavior.
- **Done criteria:** Any new claim is backed by collected data and a documented interpretation; if unapproved, this item remains deferred.
- **Mentor checkpoint:** Explain why current presence cannot be presented as true watch time.

### M7 — Optional AI Creator Assistant

**Objective:** Provide trustworthy, optional creator advice through a scoped service boundary, with proposals clearly separated from executed actions. **Why now:** Analytics definitions and service authorization must be trustworthy before an agent can use them. **Prerequisites:** R14, R44-R45; product policy before any autonomous action. **Work items:** R47-R49. **Learning outcomes:** Tool trust boundary, prompt/data provenance, safe proposal protocol, approval, failure isolation. **Exit gate:** Read-only advice works with known-source metrics; proposals cannot mutate state; any approved action is reauthorized by backend and auditable. **Deferred work:** Agent-owned product state, fabricated metrics, unsupervised destructive action.

**R47 — Complete a read-only Creator Assistant path.** **Category:** PRODUCT CAPABILITY.
- **Business purpose:** Creators can ask for an explanation of their actual stream data without risking state changes.
- **Current behavior to trace:** /streams/creator-coach backend call, current analytics payload, empty agent entry point/orchestrator, model timeout.
- **Files:** backend/src/controllers/CreatorCoachController.controller.js; backend/src/utils/streamAnalytics.js; agent-service/main.py; agent-service/agents/orchestrator.py.
- **Engineering concepts:** Service authentication, source grounding, timeout, safe fallback, read-only tool.
- **Dependencies:** R14, R44-R45; R46 only for questions that require new telemetry.
- **Suggested implementation boundary:** Establish a minimal authenticated request/response and approved analytics read; keep the agent optional to streaming.
- **Tests / verification:** Known metric question, unavailable metric question, wrong secret, timeout, malformed answer, no DB write.
- **Done criteria:** Advice cites only available data and agent outage does not block creator streaming.
- **Mentor checkpoint:** Explain which component may explain a metric and which component defines it.

**R48 — Add explicit agent proposals.** **Category:** PRODUCT CAPABILITY.
- **Business purpose:** A creator can inspect a recommended action before the product changes.
- **Current behavior to trace:** Scheduler/moderator tool calls and existing backend announcement/moderation routes.
- **Files:** agent-service/tools/scheduler_tools.py; agent-service/tools/moderation_tools.py; backend/src/middlewares/Auth.middleware.js; backend/src/controllers/ModerationController.controller.js.
- **Engineering concepts:** Proposal DTO, capability scope, actor binding, confirmation UX, stale proposal.
- **Dependencies:** R14, R47.
- **Suggested implementation boundary:** Return a structured proposal with target, reason and required confirmation; no mutation from proposal generation.
- **Tests / verification:** Wrong actor/target, expired proposal, unsupported tool, unchanged backend state.
- **Done criteria:** Proposal creation has no product side effect and cannot masquerade as an approved command.
- **Mentor checkpoint:** Explain why the agent's service credential cannot serve as the creator's consent.

**R49 — Execute only approved, scoped agent actions if product policy allows.** **Category:** PRODUCT CAPABILITY.
- **Business purpose:** A confirmed creator action can use existing backend business rules safely.
- **Current behavior to trace:** Existing human-triggered schedule/announcement/moderation command and agent tool bypass risk.
- **Files:** backend/src/controllers/ModerationController.controller.js; backend/src/controllers/NotificationController.controller.js; agent-service/tools/moderation_tools.py; agent-service/tools/scheduler_tools.py.
- **Engineering concepts:** Human confirmation, backend reauthorization, idempotency, audit trail.
- **Dependencies:** R48 and explicit PRODUCT DECISION on allowed action classes.
- **Suggested implementation boundary:** Start with one low-risk confirmed action routed through the same authorized use case as a human request; defer destructive automation.
- **Tests / verification:** Confirm/reject, changed role/ownership, duplicate execution, agent timeout, audit record.
- **Done criteria:** No state change occurs without current backend authorization and required human confirmation; if policy is absent, item stays deferred.
- **Mentor checkpoint:** Explain why confirmation at proposal time is insufficient if permissions change before execution.

### M8 — Node backend v1 completion and behavioral freeze

**Objective:** Make Node v1 a reliable, explicit behavioral reference for a later implementation. **Why now:** A Java rewrite cannot be judged against unstable, undocumented semantics. **Prerequisites:** Required M0-M7 behavior and decisions, including media DB decoupling and critical frontend journeys. **Work items:** R50-R51. **Learning outcomes:** Contract freeze, release evidence, regression suite, operational readiness. **Exit gate:** Section 7 is met; signed-off fixtures and behavior inventory are versioned. **Deferred work:** Spring coding until the entry gate passes; optional unapproved agent actions/telemetry.

**R50 — Exercise critical journeys and failure seams.** **Category:** TEST / OBSERVABILITY.
- **Business purpose:** The reference implementation must prove the paths users and services actually depend on.
- **Current behavior to trace:** Registration/login/OAuth, public/private content, watch/live, donation/top-up, upload/delete, admin and media callbacks.
- **Files:** backend/src/routes; backend/src/sockets; media-service/src/config/mediaServer.config.js; frontend/src/App.tsx; backend/package.json; frontend/package.json.
- **Engineering concepts:** Contract fixture, integration versus E2E, provider test mode, observability, rollback criterion.
- **Dependencies:** R02-R25, R34-R45, R47-R48 if AI advice is in required v1 scope.
- **Suggested implementation boundary:** Add the highest-risk missing test per journey and run representative deployed-topology checks; avoid a coverage-percentage project.
- **Tests / verification:** 401/403/404, old callback, Redis loss, provider uncertainty, private asset known URL, vi/en critical paths.
- **Done criteria:** Critical failures have a visible recovery/alert path and the completion-gate checklist has evidence links.
- **Mentor checkpoint:** Explain which tests prove local code and which prove the real cross-service boundary.

**R51 — Freeze /api/v1, events and migration fixtures.** **Category:** TEST / OBSERVABILITY.
- **Business purpose:** Spring can be compared against a versioned behavioral contract instead of a moving Node implementation.
- **Current behavior to trace:** Mounted /api/v1 and /api alias, Socket events, media callbacks, DTO/error variants and consumer inventory.
- **Files:** backend/index.js; backend/src/routes; backend/src/sockets/index.js; media-service/src/config/mediaServer.config.js; BACKEND_STANDARDS.md.
- **Engineering concepts:** Semantic versioning, compatibility, fixture provenance, release baseline.
- **Dependencies:** R25, R50 and the applicable Section 7 behavior/operational checks; R51 completes the final release-record check.
- **Suggested implementation boundary:** Record an approved v1 contract catalog, fixtures, known deviations and baseline revision; freeze meanings rather than source layout.
- **Tests / verification:** Run contract fixture suite against frozen Node release and check all known clients/callbacks.
- **Done criteria:** Any later incompatible contract change requires explicit version/decision, and Spring has executable acceptance criteria.
- **Mentor checkpoint:** Explain why changing from MongoDB to SQL does not itself require /api/v2.

### M9 — Spring Boot and relational backend v2

**Objective:** Replace Node's product-backend implementation while preserving approved behavior and the separate media mechanics boundary. **Why now:** Only a frozen Node reference and decoupled media authorization make parity measurable. **Prerequisites:** Section 8 entry gate, approved data/cutover topology, R15. **Work items:** R52-R63. **Learning outcomes:** Java/Spring architecture, MVC/Security, relational constraints, JPA, transactions, isolation, locking, fetching and behavioral parity. **Exit gate:** All required Node v1 contracts pass against Spring in an isolated environment and a bounded cutover/rollback is proven. **Deferred work:** Line-by-line Java translation, simultaneous frontend rewrite, media-service merger, /api/v2 solely because language changes.

**R52 — Bootstrap Spring with one public query parity slice.** **Category:** MIGRATION.
- **Business purpose:** Prove Java project structure and HTTP contract shape with a low-risk resource.
- **Current behavior to trace:** Node GetViewableVideo route/use case/DTO/error and frozen fixture.
- **Files:** backend/src/routes/VideoRoute.route.js; backend/src/controllers/VideoController.controller.js; backend/src/models/Video.model.js; frontend/src/store/api/videoApi.ts.
- **Engineering concepts:** Spring MVC, validation, layered package boundary, application query, controller adapter.
- **Dependencies:** R17, R22-R23, R51.
- **Suggested implementation boundary:** Build one isolated Spring route and run the same public/owner/admin fixture; do not port Node files mechanically.
- **Tests / verification:** Contract fixture, validation/error map, locale-independent DTO, basic startup/health.
- **Done criteria:** One Spring endpoint reproduces the frozen semantics under a documented adapter.
- **Mentor checkpoint:** Map request → controller → application query → persistence adapter → DTO in both stacks.

**R53 — Model the first relational persistence slice and migration.** **Category:** MIGRATION.
- **Business purpose:** Preserve user/video ownership and visibility with database-enforced integrity.
- **Current behavior to trace:** Mongo User/Video IDs, relationships, unique fields, status transitions and DTO mapping.
- **Files:** backend/src/models/User.model.js; backend/src/models/Video.model.js; backend/src/models/Comment.model.js; BACKEND_STANDARDS.md.
- **Engineering concepts:** Keys, foreign keys, CHECK/UNIQUE constraints, indexes, schema migration, JPA mapping, N+1.
- **Dependencies:** R52; approved relational engine and ID migration strategy.
- **Suggested implementation boundary:** Model only tables needed by the first query and its actor; write versioned migration and query plan before adding the rest.
- **Tests / verification:** Constraint violations, index/query plan, missing relation, populated read count, legacy ID mapping.
- **Done criteria:** First parity slice reads valid relational data without leaking SQL/JPA shape into DTOs.
- **Mentor checkpoint:** Explain what a foreign key enforces that an application check alone cannot.

**R54 — Reproduce session and authorization semantics in Spring Security.** **Category:** MIGRATION.
- **Business purpose:** Existing users retain login/OTP/OAuth/session behavior and protected access after backend replacement.
- **Current behavior to trace:** Node auth routes, createToken cookie, HTTP and socket verification, inactive account rule; compare with the frozen approved identity contract if P05 selected Keycloak.
- **Files:** backend/src/routes/UserRoute.route.js; backend/src/controllers/UserController.controller.js; backend/src/middlewares/Auth.middleware.js; backend/src/config/passport.config.js; backend/src/sockets/auth.socket.js.
- **Engineering concepts:** Spring Security filter chain, authentication versus authorization, cookie/JWT compatibility, CSRF, OAuth callback.
- **Dependencies:** R06-R07, R14, R51-R53; approved host/cookie topology.
- **Suggested implementation boundary:** Port one auth journey and one protected resource at a time, preserving the frozen approved session/authorization semantics and error codes; follow the P05 identity decision rather than assuming custom JWT or Keycloak.
- **Tests / verification:** Password/OTP, Google, inactive/banned, 401/403, cookie options, CSRF/origin, socket handoff.
- **Done criteria:** Frozen auth fixtures and deployed-topology browser flows pass without a second auth authority.
- **Mentor checkpoint:** Explain where Spring Security identifies the principal and where a use case authorizes a resource.

**R55 — Reproduce video/asset lifecycle against relational persistence.** **Category:** MIGRATION.
- **Business purpose:** Public/private content and provider assets keep the same safe behavior.
- **Current behavior to trace:** Video detail/list, comments/reactions/clips, upload/delete and Cloudinary cleanup.
- **Files:** backend/src/controllers/VideoController.controller.js; backend/src/controllers/CommentController.controller.js; backend/src/controllers/ClipController.controller.js; backend/src/config/cloudinary.config.js.
- **Engineering concepts:** Aggregate boundary, FK cascades versus explicit deletion, provider compensation, JPA fetching.
- **Dependencies:** R02-R05, R08, R16-R17, R51-R54.
- **Suggested implementation boundary:** Port one content operation per reviewable change; retain provider cleanup/reconciliation outside the SQL transaction.
- **Tests / verification:** Visibility matrix, related reads, known private asset URL, upload failure, delete/provider failure, N+1 query checks.
- **Done criteria:** Content and asset fixtures pass with no authorization regression.
- **Mentor checkpoint:** Explain which data is relationally constrained and which asset state remains external.

**R56 — Reproduce DonateCoins with relational concurrency controls.** **Category:** MIGRATION.
- **Business purpose:** Coin movement remains atomic and retry-safe under the new database.
- **Current behavior to trace:** Frozen donation transaction, idempotency key, ledger and notification behavior.
- **Files:** backend/src/controllers/CoinController.controller.js; backend/src/models/Donation.model.js; backend/src/models/User.model.js.
- **Engineering concepts:** SQL transaction, isolation, row/version locking, unique key, deadlock retry.
- **Dependencies:** R12, R18, R51-R54; relational balance/ledger schema approved.
- **Suggested implementation boundary:** Port the command and prove the invariant under concurrent SQL writes; choose locking from measured race cases.
- **Tests / verification:** Same/different idempotency keys, concurrent insufficient funds, rollback and post-commit failure.
- **Done criteria:** Node fixture and concurrent balance invariant pass on the selected relational database.
- **Mentor checkpoint:** Explain why @Transactional alone may not prevent two simultaneous spends.

**R57 — Reproduce CompleteTopUp and Stripe reconciliation.** **Category:** MIGRATION.
- **Business purpose:** Paid intent fulfillment stays exactly-once at the product boundary.
- **Current behavior to trace:** Node intent creation, signed webhook/confirm, matching attributes, pending claim/credit.
- **Files:** backend/src/controllers/CoinController.controller.js; backend/src/models/TopUp.model.js; backend/src/routes/CoinRoute.route.js.
- **Engineering concepts:** Webhook verification, unique provider identity, conditional claim, uncertain external outcome.
- **Dependencies:** R13, R19, R51-R54, R56.
- **Suggested implementation boundary:** Port one fulfillment path then share the command across confirm/webhook; keep Stripe SDK at infrastructure edge.
- **Tests / verification:** Duplicate/reordered webhook, lost response, mismatch, concurrent claim, real provider test-mode callback.
- **Done criteria:** Frozen top-up fixtures pass and one intent cannot credit twice.
- **Mentor checkpoint:** Explain how SQL uniqueness and backend reconciliation complement Stripe's payment status.

**R58 — Reproduce stream lifecycle with unchanged media service.** **Category:** MIGRATION.
- **Business purpose:** Creators and viewers retain publish/playback while product persistence changes.
- **Current behavior to trace:** Node Publish/End commands, media callbacks, active session ID, readiness, HLS URL and termination.
- **Files:** backend/src/controllers/StreamController.controller.js; backend/src/utils/streamPayload.js; backend/src/utils/mediaControl.js; media-service/src/config/mediaServer.config.js.
- **Engineering concepts:** State transition, callback replay, service identity, relational compare-and-set, media control/data split.
- **Dependencies:** R09-R11, R14-R15, R20, R51-R54.
- **Suggested implementation boundary:** Match the frozen internal media contract and session state in Spring; keep FFmpeg/HLS in media service.
- **Tests / verification:** Signed ingest, publish/readiness, stale unpublish, heartbeat expiry, terminate, backend restart.
- **Done criteria:** Media talks to the Spring backend through its contract without direct product DB access or client-visible change.
- **Mentor checkpoint:** Explain why media does not need to know whether product data is MongoDB or SQL.

**R59 — Reproduce realtime and moderation behavior.** **Category:** MIGRATION.
- **Business purpose:** Chat/presence/moderation and durable-event reconciliation survive backend replacement.
- **Current behavior to trace:** Socket auth, room join/leave, Redis adapter/presence/moderation, notification events.
- **Files:** backend/src/sockets/index.js; backend/src/sockets/auth.socket.js; backend/src/sockets/presence.store.js; backend/src/sockets/moderation.store.js.
- **Engineering concepts:** Socket.IO protocol parity or approved compatible transport, transient state, multi-instance behavior, event version.
- **Dependencies:** R14, R21, R51, R54, R58.
- **Suggested implementation boundary:** Prove one room/permission/event path at a time against current clients; preserve recovery through backend queries.
- **Tests / verification:** Anonymous watch, banned chat, reconnect/rejoin, duplicate/late event, Redis loss, multi-tab.
- **Done criteria:** Required socket fixtures and viewer journeys pass under selected deployment topology.
- **Mentor checkpoint:** Explain why Redis presence cannot be the durable source of a stream's product state.

**R60 — Reproduce one admin query/command pair.** **Category:** MIGRATION.
- **Business purpose:** Admin can inspect a target and perform one protected action under Spring.
- **Current behavior to trace:** A frozen user list/detail and ban/role pair, then the analogous stream/content pairs.
- **Files:** backend/src/routes/AdminRoute.route.js; backend/src/controllers/AdminController.controller.js; backend/src/middlewares/Admin.middleware.js.
- **Engineering concepts:** Privileged use case, DTO parity, current-role check, query pagination.
- **Dependencies:** R21, R41-R43, R51-R54, R58.
- **Suggested implementation boundary:** Port one admin query and its related command per commit; repeat this item pattern for the remaining frozen admin inventory.
- **Tests / verification:** Admin/non-admin, target missing, role/ban or terminate/remove result, audit and side-effect failure.
- **Done criteria:** The selected pair matches Node fixtures; milestone stays open until all required admin pairs pass.
- **Mentor checkpoint:** Explain why cached frontend role state cannot authorize the command.

**R61 — Reproduce durable notification and delivery boundary.** **Category:** MIGRATION.
- **Business purpose:** Users keep notification records even when immediate socket delivery fails.
- **Current behavior to trace:** Notification creation/read state, post-commit emit, failure handling.
- **Files:** backend/src/controllers/NotificationController.controller.js; backend/src/models/Notification.model.js; backend/src/sockets/index.js.
- **Engineering concepts:** Durable record versus best-effort delivery, transaction timing, retry policy.
- **Dependencies:** R51-R54, R59; frozen notification fixture.
- **Suggested implementation boundary:** Port one notification-producing use case and read-state contract, then repeat for required notification types.
- **Tests / verification:** Persisted record with missed socket event, duplicate emit, 401/owner read and locale-safe destination.
- **Done criteria:** Durable read/unread behavior matches Node and lost delivery cannot silently erase a required record.
- **Mentor checkpoint:** Explain what a notification record proves that a Socket event does not.

**R62 — Reproduce optional Creator Assistant service boundary.** **Category:** MIGRATION.
- **Business purpose:** Creator advice stays optional and cannot gain product authority when backend language changes.
- **Current behavior to trace:** Creator Coach request, analytics data and approved agent tool scope.
- **Files:** backend/src/controllers/CreatorCoachController.controller.js; backend/src/middlewares/Auth.middleware.js; agent-service/main.py; agent-service/tools/moderation_tools.py.
- **Engineering concepts:** Service principal, acting user, timeout, capability scope, safe fallback.
- **Dependencies:** R47-R48 if part of frozen v1, R51-R54, R61 for any notification tool.
- **Suggested implementation boundary:** Port read-only advice first, then only explicitly approved proposal/action tool contracts.
- **Tests / verification:** Wrong secret, wrong actor/resource, unavailable agent, unsupported metric, confirmed action policy.
- **Done criteria:** Required frozen agent fixtures pass and agent failure leaves core streaming usable.
- **Mentor checkpoint:** Explain why the agent never writes directly to the relational product database.

**R63 — Compare complete contract parity and prepare data cutover.** **Category:** TEST / OBSERVABILITY.
- **Business purpose:** Traffic should switch only after Spring behavior and migrated data can be trusted.
- **Current behavior to trace:** Frozen Node endpoints/events/callbacks, IDs/provider references, production route and session topology.
- **Files:** ARCHITECTURE.md; BACKEND_STANDARDS.md; backend/index.js; docker-compose.yml; media-service/index.js.
- **Engineering concepts:** Differential contract test, migration rehearsal, dual-write risk, rollback, observability.
- **Dependencies:** R52-R61; R62 only if the assistant is in frozen v1 scope; approved relational data-transfer/deployment plan.
- **Suggested implementation boundary:** Run the complete fixture suite and a bounded rehearsal, compare outcomes/side effects, and document rollback before moving traffic.
- **Tests / verification:** Public/protected/E2E parity, payment identities, active sessions, provider callbacks, data counts, rollback drill.
- **Done criteria:** Explicit owner approves cutover evidence; no untested public path or unresolved data-authority split remains.
- **Mentor checkpoint:** Explain what happens to a payment or live stream already in flight during rollback.

## 6. Learning progression

Learning follows the work rather than preceding it as a separate course:

| Work | Concepts to learn by doing | Explain-back evidence |
|---|---|---|
| R02-R07 | HTTP request flow; authentication, authorization, ownership, visibility; OTP and cookie session | Trace one anonymous/private request and one successful login from route to DB to response. |
| R08-R16 | Local transactions versus provider effects; idempotency; concurrency; stream state; realtime/media trust | Identify the authoritative owner and recovery path for a lost webhook or old unpublish. |
| R17-R25 | Commands/queries; lightweight DDD; application/domain/infrastructure boundaries; DTOs/errors; tests | Draw one vertical slice and distinguish business invariant from transport and persistence details. |
| R26-R33 | Design System; Next App Router; Server/Client Components; i18n; theme; state ownership; RTK Query | Explain why one resource has one ongoing freshness owner and why shared/api/baseApi is outside store/. |
| R34-R43 | Route migration; Socket.IO; HLS; Stripe; uploads; SEO; admin UX and accessible responsive composition | Trace one complete migrated user journey and its rollback path. |
| R44-R49 | Metric provenance, analytics limits, agent grounding, proposals and authorization | Separate observed data, derived metric, inference, proposal and executed command. |
| R50-R51 | Contract fixtures, release freeze and operational evidence | State what Spring must preserve and what it may implement differently. |
| R52-R63 | Spring MVC/Security; relational modeling; JPA/Hibernate; migrations; foreign keys/constraints/indexes; isolation/locking; N+1/fetch strategies; behavioral migration | Prove a Node fixture against Spring and explain its SQL concurrency and query behavior. |
| P01-P03 | Jest regression, request, integration, concurrency and contract tests; existing Docker Compose service graph | Reproduce a real bug and identify which layer a test or container health check actually verifies. |
| P04-P08 | OAuth/OIDC and Keycloak ownership decision; Jenkins CI; stable Docker images | Explain why introducing an identity provider changes authority, while CI and images change delivery workflow. |
| P09-P12 | Kubernetes primitives and operations; optional cross-service observability | Use manifests and kubectl to trace a failing workload before considering Rancher or centralized tooling. |
| P13-P15 | Rancher management, Jenkins image promotion, Spring parity deployment | Explain the image, contract, rollout and rollback evidence for a bounded backend switch. |

At each step, use a small trace and one design question before coding. A concept is learned when the developer can predict a failure case and explain why the selected test would catch it. Platform checkpoints are parallel exercises tied to R items; they are not extra services or mandatory gates for unrelated product work.

## 7. Node v1 completion gate

Node v1 is a behavioral reference only when all applicable checks below have evidence attached to a versioned revision. A green unit suite alone is insufficient.

1. **Security and privacy:** Anonymous, owner and admin visibility matrices pass for video/detail/related reads and public metadata. Known private asset URLs cannot be consumed by unauthorized users, or private delivery is not claimed as complete. OTP replay/expiry/attempt handling, inactive accounts, service principals and cookie-bearing mutation protection have boundary tests. If P05 adopts Keycloak, its approved identity split and migration are reflected in the authority documents and these tests.
2. **Integrity:** Donation debit/credit/record is atomic and idempotent under concurrent retries; verified top-ups credit at most once and ambiguous Stripe outcomes reconcile. Video/Cloudinary deletion has an observable partial-failure recovery path.
3. **Live semantics:** Every broadcast has distinct session identity; stale callbacks cannot mutate a newer session; public LIVE requires current playable HLS. Media authorization no longer depends on direct product MongoDB schema reads. Publish, readiness, heartbeat, unpublish, termination and restart cases are tested.
4. **Contracts:** /api/v1 DTO/error meanings, socket events, media callbacks, idempotency keys and visibility are documented and exercised by representative fixtures. Persistence-only Mongoose shapes do not leak into chosen stable public DTOs. Legacy /api and economy consumers are inventoried with an explicit compatibility/retirement choice.
5. **Capabilities:** Minimum Admin Console backend operations and truthful creator analytics are complete. If read-only AI Creator Assistant/proposals are included in v1 product scope, their optionality and scoped tool contract pass tests. Unapproved autonomous actions or new telemetry do not block v1.
6. **Operational evidence:** Backend tests pass, including the previously failing stream payload case. Critical HTTP, Socket, media, Stripe test-mode, Cloudinary, auth/OAuth and frontend consumer journeys pass under the approved deployment topology. Logging/metrics identify stale callbacks, provider reconciliation, cleanup failures and agent/tool denials without exposing secrets.
7. **Release record:** Known limitations, product/deployment decisions, data identities, contract fixtures, rollback criteria and Node revision are recorded. A responsible reviewer signs off the frozen behavior inventory.

An item that cannot pass because an external choice is pending is explicitly marked **blocked by that decision**; it is not silently waived. Independent work can continue, but the Node freeze cannot be declared complete while a required invariant is unverified.

## 8. Spring v2 entry gate

Start Spring implementation work only after Section 7 passes. Java/Spring learning and isolated experiments may happen earlier, but they do not count as v2 implementation or change the production boundary.

Entry evidence must include: a frozen Node /api/v1 and event/callback fixture suite; a media authorization contract independent of MongoDB; an approved relational database and migration/ID mapping plan; a frozen authentication-authority decision (custom session or approved Keycloak split); a production cookie/session, ingress and rollback topology; provider identity reconciliation rules for Stripe/Cloudinary; and an explicit list of required routes/events with owners. Spring v2 implements behavior/use cases/contracts, not a file-by-file translation. A database/language change alone does not create /api/v2.

Each Spring slice must run the corresponding frozen Node fixture, test relational constraints and concurrent writes where relevant, and inspect actual queries for N+1 or overfetch. No cutover occurs until R63 passes.

## 9. Decisions and dependencies still requiring validation

| Status | Decision / dependency | Blocks or affects | Evidence needed |
|---|---|---|---|
| EXTERNAL / DEPLOYMENT DECISION | Frontend/API public host, cookie scope, CSRF/origin policy, OAuth/payment returns, Socket.IO ingress and route traffic owner | Authenticated Next server reads; R28, R32-R33, R37, R50, R54, R63 | Approved deployment diagram and browser/SSR/callback tests. |
| EXTERNAL / DEPLOYMENT DECISION | Protected Cloudinary/HLS delivery, CDN cache, CORS, TLS and asset expiry | R16, R35-R36, Node privacy gate | Known-URL unauthorized playback test at actual delivery origin. |
| NEEDS VALIDATION | Exact active-session ID, media readiness observation, callback retry/replay and HLS propagation | R10-R11, R20, R58 | Media/backend integration tests with old and delayed callbacks. |
| NEEDS VALIDATION | Redis multi-instance behavior under loss and process fallback | R36, R50, R59 | Multi-instance reconnect/presence/moderation exercise. |
| NEEDS VALIDATION | RTK Query baseApi adoption/consolidation, server/client initial-data handoff, public cache policy | R31, R34-R36 | Pilot route without duplicate fetch or stale flash; endpoint registration test. Ownership rule remains shared/api/baseApi if adopted. |
| NEEDS VALIDATION | Exact Design System breakpoints/container widths and final font family | R40 and visual approval | Populated vi/en screens; human font decision with Vietnamese and English. Current logo remains provisional and is not redesigned here. |
| PRODUCT DECISION | Private-content owner/admin concealment response and any unlisted state | R02, R16, R17, R35 | Approved access matrix; no accidental public data. |
| PRODUCT DECISION | Stream chat-ban durability and creator analytics/telemetry promises | R44-R46, R59 | Named metric questions, retention/privacy policy and restart expectation. |
| PRODUCT DECISION | Whether AI may execute any confirmed/automated action | R49, R62 | Allowed action list, approval/audit policy and backend scope contract. |
| NEEDS VALIDATION | Stripe reconciliation, Cloudinary cleanup and media failure behavior at deployed provider boundaries | R08, R11-R13, R50, R55-R58 | Test-mode/provider integration and recovery drill. |
| EXTERNAL / DEPLOYMENT DECISION | Relational engine/hosting, migration of opaque IDs and provider identities, traffic cutover | R53-R63 | Schema/data rehearsal, parity comparison and rollback drill. |
| ARCHITECTURE DECISION | Whether Keycloak becomes identity authority; which OTP, Google, role, session and service-identity responsibilities stay in OmexLive | P05/P08, R32, R37, R54 | P04 ownership map and migration decision; if adopted, deliberately update ARCHITECTURE.md and BACKEND_STANDARDS.md before implementation, then reconcile companion frontend rules. |
| NEEDS VALIDATION | Jenkins CI checks, image build reproducibility and registry/deployment permissions | P06/P07/P14 | Existing check inventory, green pipeline, immutable image reference and bounded rollback. |
| EXTERNAL / DEPLOYMENT DECISION | Kubernetes cluster/Ingress/storage and whether it is the selected production deployment platform | P09-P11/P14/P15; does not block unrelated R work | Test-namespace operations, persistence/restart rehearsal and ingress/session/media validation. |
| NEEDS VALIDATION | Whether centralized logs/metrics solve a measured cross-service diagnosis gap | P12 | Correlation trace and operational question that current logs/health checks cannot answer reliably. |

These are gates for the affected item, not reasons to pause all unrelated work. Record the decision and its evidence when it closes.

## 10. Suggested first 10 work items

| Order | Item | Why this position |
|---:|---|---|
| 1 | R01 — Classify the stream payload test | Small reproducible baseline; prevents a known red suite from obscuring later failures. |
| 2 | R02 — Video-detail visibility | Confirmed public metadata exposure; establishes the policy used by related reads. |
| 3 | R03 — Parent-video comments | Child reads can reveal the same hidden resource after detail is corrected. |
| 4 | R04 — Reactions and views | Commands must enforce that policy independently of UI controls. |
| 5 | R05 — Derived clips | Source visibility changes can leave derived public access. |
| 6 | R06 — OTP lifecycle | Account proof and replay are security-critical and independent of UI migration. |
| 7 | R07 — Profile restoration | Network/500 must not be confused with unauthenticated state; supports later Next migration. |
| 8 | R08 — Video deletion/provider cleanup | Close a cross-provider data-integrity seam before extracting the workflow. |
| 9 | R09 — LIVE/HLS semantics | Establish the public state rule before adding active session identity. |
| 10 | R10 — Active broadcast-session identity | Gives the following stale-callback item a correlation key. |

This order is a suggested learning/review sequence, not permission to ignore an urgent production incident. R16 private byte-delivery proof should be investigated alongside R02; its completion depends on a delivery decision and must not be falsely marked done. R12-R13 economy work becomes the next high-priority integrity track after the first stream items, or earlier if live payment risk is observed.

**Parallel platform sequence for the same first ten:** Start P01 during R01-R02 by preserving the existing Node test baseline and writing a real Jest request regression for R02. Start P02 during M0 by explaining and running the current Compose core stack. Deepen Jest with P03 when R08/R12/R13 expose provider and concurrency seams. After R06 and R07 are stabilized, perform P04's Keycloak investigation and P05's ownership decision. P06 Jenkins CI follows once those real tests and existing lint/build checks produce meaningful feedback. None of P02-P06 delays an unrelated security fix.

## 11. Definition of Done for an individual work item

1. The developer states the business purpose and traces only the relevant current route/consumer, data read/write, owner, external effect and failure paths. Label **CURRENT / CONFIRMED**, **INFERENCE**, and **UNKNOWN**.
2. The developer writes the invariant, affected contract, dependency and a small design before coding. A product/deployment decision is resolved or explicitly gates the item.
3. The developer writes a focused diff, preferably one conceptual change per commit; no unrelated refactor or copy-paste feature replacement.
4. Tests prove the intended success and at least the material denial/failure/race case. Run existing relevant tests and report any preexisting failure separately.
5. The developer checks authorization, data exposure, retry/idempotency, external side effects, logging and cleanup as applicable; frontend work also checks vi/en, keyboard/focus, theme, narrow width and hydration where applicable.
6. Codex reviews the diff for correctness, boundaries, edge cases, tests and readability, explains issues, and the developer revises. The developer can explain the design and tradeoffs back.
7. The final commit updates the relevant contract/decision record if semantics changed and leaves a clear verification note. The item is done only when its explicit criterion above passes.

For a platform checkpoint, the same loop applies to configuration and manifests: the developer authors them, demonstrates the real OmexLive scenario, explains the failure mode, and records verification. A learning exercise is not a release gate unless a named R item or deployment decision genuinely depends on it.

## 12. How Codex should mentor during execution

Work on **one main issue at a time**. For the selected item, first explain the business purpose, then trace the current code path with exact routes/files/functions and distinguish confirmed behavior from inference. Name the authoritative owner, invariants, trust boundaries and failure cases. Help the developer choose a small design and test plan before coding. Pseudocode, interfaces, signatures, tiny examples and a file skeleton are allowed; complete production implementations are not, unless the developer explicitly asks.

The developer writes the production code and platform configuration. Codex reviews the actual diff and gives concrete findings with severity, evidence and suggested reasoning; explain mistakes instead of silently replacing the work. Ask an explain-back question where it tests a key invariant. During debugging, give **one concrete next command or check**, wait for its result, then choose the next step. Do not broaden the ticket into a refactor or claim a contract is fixed by frontend hiding. Keep the four standards authoritative and update roadmap ordering only when evidence changes a dependency.

## 13. Engineering Platform / OHBI Technology Learning Track

This is a **parallel learning track**, not a second product backlog or permission to install every tool. Each checkpoint is attached to a real OmexLive test, service or delivery need. Its P ID is distinct from the R01-R63 application IDs. A checkpoint is optional until its stated prerequisite and problem exist; only an approved identity or deployment choice creates a hard gate for the affected application item. The developer writes all production code, tests and platform configuration. Codex explains, offers small skeletons or pseudocode, reviews the developer's work and debugs one check at a time.

### P01 — Jest on a real visibility regression (M0; R01-R05)

- **Why OmexLive needs it now:** R02 has a reproducible anonymous/private-video access risk, and R01 exposes the limits of the current sparse backend suite.
- **What I should learn:** Jest test lifecycle, assertions, request-level harness, ESM configuration, fixtures and test isolation; compare these with the current backend node --test and frontend Vitest without assuming one runner must replace both.
- **Prerequisites:** Trace R01's existing failure and R02's route/query behavior; understand the expected access matrix before asserting it.
- **Small hands-on exercise:** Write one Jest request regression that fails for an anonymous private video detail request, then use it to verify the developer's R02 fix. Keep the existing backend tests runnable.
- **Relevant OmexLive services/files:** backend/package.json; backend/index.js; backend/src/routes/VideoRoute.route.js; backend/src/controllers/VideoController.controller.js; backend/src/utils/__tests__/streamPayload.test.js.
- **What NOT to automate yet:** Do not port the whole node:test or Vitest suite, add coverage quotas, or write duplicate tests solely to exercise Jest.
- **Verification:** The regression demonstrates the unsafe response before R02 and the intended denial after it; both Jest and existing tests run repeatably with a documented command.
- **Mentor checkpoint:** Explain what the request test proves that a direct controller assertion would miss, and why the old suite remains useful.

### P02 — Understand the existing Docker Compose system (M0; M1 service work)

- **Why OmexLive needs it now:** Transactions require the configured Mongo replica set; realtime uses Redis; publish/playback crosses backend and media-service.
- **What I should learn:** Image versus container, build context, service DNS, environment, dependency and health conditions, bind mounts versus named volumes, and safe logs.
- **Prerequisites:** A local Docker/Compose environment and nonproduction configuration; read docker-compose.yml before starting services.
- **Small hands-on exercise:** Validate the Compose model, start only the existing core services needed for one R item, inspect backend/media/MongoDB/Redis health and service-to-service addresses, then stop them cleanly.
- **Relevant OmexLive services/files:** docker-compose.yml; backend/Dockerfile; frontend/Dockerfile; media-service/Dockerfile; backend/index.js; media-service/index.js. The agent profile is optional and its Dockerfile is not checked in.
- **What NOT to automate yet:** Do not add demo services, a registry, a production deployment, or the incomplete agent just to populate the stack.
- **Verification:** The chosen real route or health path works through the intended containers; the developer can identify whether a failure is build, startup dependency, network, health or app behavior.
- **Mentor checkpoint:** Explain why backend health, Redis health and Mongo replica-set initialization are separate facts.

### P03 — Grow Jest into integration, concurrency and contract evidence (M1-M2; R08-R13, R25)

- **Why OmexLive needs it now:** Video deletion, donations, top-ups and media callbacks have failure/retry behavior that pure unit tests cannot establish.
- **What I should learn:** Integration fixture lifecycle, test database isolation, concurrent requests, provider boundary fakes versus test-mode calls, and stable contract assertions.
- **Prerequisites:** P01; the relevant R item's invariants and a safe test environment, using P02's real dependencies when needed.
- **Small hands-on exercise:** Add one Jest concurrency case for R12's same-key donation replay and one request/contract fixture for R25; expand to R08/R11/R13 only as those items are worked.
- **Relevant OmexLive services/files:** backend/src/controllers/CoinController.controller.js; backend/src/models/Donation.model.js; backend/src/controllers/StreamController.controller.js; backend/src/controllers/VideoController.controller.js; docker-compose.yml.
- **What NOT to automate yet:** Do not build a universal test framework, require live payment charges for every run, or migrate frontend Vitest tests for tool uniformity.
- **Verification:** A test fails for a meaningful race or contract deviation, then passes with isolated data and is repeatable locally/CI; provider tests distinguish simulated from real test-mode evidence.
- **Mentor checkpoint:** Explain which guarantee comes from the test harness, which comes from database constraints/transactions, and which still needs provider integration evidence.

### P04 — Investigate Keycloak only after auth stabilization (M1-M2; after R06/R07)

- **Why OmexLive needs it now:** Current custom JWT/OTP/Google flows and HTTP/Socket session behavior must be understood before deciding whether an identity provider reduces a real ownership or operational burden.
- **What I should learn:** OAuth versus OIDC; realms, clients, authorization code with PKCE, access/refresh tokens, roles/claims, backend JWT validation, frontend session behavior, Socket.IO authentication, Google identity federation if appropriate, and service identity versus end-user identity.
- **Prerequisites:** R06 and R07 are stabilized; trace backend auth, frontend restoration and socket auth; read ARCHITECTURE.md and BACKEND_STANDARDS.md's current backend-authentication authority.
- **Small hands-on exercise:** Draw the current password/OTP, Google and Socket flows, then draw a candidate OIDC flow with each token's issuer, audience, holder and validator. Mark every responsibility that might stay in OmexLive.
- **Relevant OmexLive services/files:** backend/src/routes/UserRoute.route.js; backend/src/controllers/UserController.controller.js; backend/src/config/passport.config.js; backend/src/utils/createToken.js; backend/src/middlewares/Auth.middleware.js; backend/src/sockets/auth.socket.js; frontend/src/App.tsx; frontend/src/pages/AuthCallback/AuthCallback.tsx.
- **What NOT to automate yet:** Do not deploy Keycloak, replace cookies, move OTP/Google/roles wholesale, or treat a service token as an end-user token.
- **Verification:** A written current-versus-candidate sequence and responsibility matrix covers login, refresh/logout, inactive users, HTTP, Socket.IO, frontend restoration and service callers.
- **Mentor checkpoint:** Explain what identity proof Keycloak could issue and which product authorization checks the OmexLive backend must still enforce.

### P05 — Decide identity ownership before any Keycloak integration (M2; R32/R37/R54 planning)

- **Why OmexLive needs it now:** Keycloak adoption would change the approved authority split, not just add a container.
- **What I should learn:** Identity provider versus resource server, user provisioning/linking, role source, migration/rollback, token lifetime and session revocation tradeoffs.
- **Prerequisites:** P04's evidence, stabilized R06/R07 behavior, and a concrete problem that Keycloak would solve.
- **Small hands-on exercise:** Compare retaining custom auth, partial federation and Keycloak as target authentication authority. Decide separately who owns OTP, Google federation, OmexLive account status/roles, backend JWT validation, frontend session and Socket.IO identity.
- **Relevant OmexLive services/files:** ARCHITECTURE.md; BACKEND_STANDARDS.md; FRONTEND_STANDARDS.md; backend/src/models/User.model.js; backend/src/utils/createToken.js; backend/src/sockets/auth.socket.js.
- **What NOT to automate yet:** Do not run a dual-authority production session or assume every current capability belongs in Keycloak.
- **Verification:** A recorded migration/ownership decision with compatibility, rollback, user-ID mapping and affected R items. **If adopted as authentication authority, ARCHITECTURE.md and BACKEND_STANDARDS.md require a deliberate decision update before P08 implementation; reconcile FRONTEND_STANDARDS.md as well.** If deferred/rejected, R32/R37/R54 follow the approved custom-session contract.
- **Mentor checkpoint:** Explain who authenticates, who authorizes a private video or admin action, and how an inactive user loses access under the selected option.

### P06 — Jenkins CI baseline from meaningful checks (M1-M2; R01, R25)

- **Why OmexLive needs it now:** Real regressions, lint and builds need repeatable feedback before route migration and contract freeze.
- **What I should learn:** Pipeline stages, clean checkout, lockfile-based install, fail-fast feedback, test reports and separation of CI from deployment.
- **Prerequisites:** P01's real tests and a green/classified R01 baseline; inventory existing frontend lint/test/build and backend test/check scripts. P03 tests can enrich CI as they arrive.
- **Small hands-on exercise:** Author a minimal pipeline: **checkout → install → lint → test → build**. Run the existing frontend lint/test/build and backend test/check; backend currently has no lint script, so document or deliberately add an appropriate check rather than calling syntax checking lint.
- **Relevant OmexLive services/files:** frontend/package.json; backend/package.json; frontend/vitest.config.ts; backend/scripts/check-syntax.js; package lockfiles; future Jenkinsfile.
- **What NOT to automate yet:** Do not add image publishing, credentials for production providers, deployment or a complex matrix to the first pipeline.
- **Verification:** A clean checkout reports the same pass/fail as local checks, fails on a deliberate test error and produces a build artifact only after earlier stages pass.
- **Mentor checkpoint:** Explain what each stage catches and why a green pipeline does not prove Stripe/media deployment behavior.

### P07 — Build stable images for existing services (M3-M4; R28/R33)

- **Why OmexLive needs it now:** A Next pilot and route rollback need reproducible images of the actual frontend/backend/media components.
- **What I should learn:** Dockerfile stages, build-time versus runtime configuration, image tagging, container health and secret exposure.
- **Prerequisites:** P02's Compose understanding, P06 build feedback where available, and the selected public route pilot.
- **Small hands-on exercise:** Rebuild one existing service image, run it with its real Compose dependencies, check its health and compare the image/config used in a repeat run. Repeat for the Next pilot when R28 exists.
- **Relevant OmexLive services/files:** frontend/Dockerfile; frontend/nginx.conf; backend/Dockerfile; media-service/Dockerfile; docker-compose.yml.
- **What NOT to automate yet:** Do not publish to a registry, build the incomplete agent image, or move all services to Kubernetes.
- **Verification:** Image starts with expected configuration and health; no server secret appears in a frontend build or image history.
- **Mentor checkpoint:** Explain why rebuilding an image and restarting a container are different operations.

### P08 — Pilot Keycloak only if P05 adopts it (M3-M4; R32/R37)

- **Why OmexLive needs it now:** An approved identity migration must be proved on a narrow real session path before replacing current auth.
- **What I should learn:** Realm/client configuration, PKCE flow, token validation and rotation, backend resource-server behavior, browser session storage, Socket.IO handshake and account mapping.
- **Prerequisites:** P05 adoption decision; deliberate updates to ARCHITECTURE.md and BACKEND_STANDARDS.md; agreed frontend/session topology; R28-R32 pilot environment.
- **Small hands-on exercise:** In an isolated preview, authenticate one test account to one protected backend route and one Socket.IO permission check. Test Google federation only if P05 assigns it to Keycloak.
- **Relevant OmexLive services/files:** backend/src/middlewares/Auth.middleware.js; backend/src/sockets/auth.socket.js; backend/src/controllers/UserController.controller.js; frontend/src/store/api/userApi.ts; frontend/src/pages/AuthCallback/AuthCallback.tsx; docker-compose.yml.
- **What NOT to automate yet:** Do not migrate all users/roles/OTP flows, expose refresh tokens to arbitrary browser code, or switch production traffic.
- **Verification:** Correct issuer/audience validation, inactive-user rejection, logout/expiry and rollback to the approved current path; backend still authorizes product resources.
- **Mentor checkpoint:** Explain the difference between accepting a valid IdP token and allowing its holder to edit a particular stream.

### P09 — Learn Kubernetes with one stateless OmexLive subset (M3-M4; after P07)

- **Why OmexLive needs it now:** Stable images make a small deployment exercise meaningful without moving the whole product.
- **What I should learn:** **Pod → Deployment → Service**, namespaces, labels/selectors, rollout status and kubectl diagnosis.
- **Prerequisites:** P02 and P07; a test cluster and a selected stateless frontend image/route that can be checked independently.
- **Small hands-on exercise:** Run the frontend image in a test namespace, first inspect its Pod, then use a Deployment and Service; roll a new image and inspect the result with kubectl.
- **Relevant OmexLive services/files:** frontend/Dockerfile; frontend/nginx.conf; docker-compose.yml; R28 public pilot.
- **What NOT to automate yet:** Do not deploy MongoDB, Redis, RTMP/media, payment callbacks or all routes to Kubernetes.
- **Verification:** The selected public route is reachable through the test Service and remains available through a controlled rollout/rollback.
- **Mentor checkpoint:** Explain what the Pod runs, what the Deployment maintains and what the Service routes to.

### P10 — Add backend configuration, secrets and health semantics (M5-M7; after P09)

- **Why OmexLive needs it now:** A backend test workload needs real dependency configuration and distinct startup/serving checks.
- **What I should learn:** **ConfigMap → Secret → readiness/liveness**, environment injection, secret handling and dependency-sensitive readiness.
- **Prerequisites:** P09 and a reachable nonproduction MongoDB/Redis environment; R14/R15 service boundary work as relevant.
- **Small hands-on exercise:** Deploy one backend test workload with nonsecret configuration separated from secrets; observe its readiness when a required dependency is unavailable and its liveness while the process still runs.
- **Relevant OmexLive services/files:** backend/Dockerfile; backend/index.js; backend/src/config/db.config.js; backend/src/config/redis.config.js; docker-compose.yml.
- **What NOT to automate yet:** Do not commit credentials, interpret /health alone as full readiness, or migrate the production database.
- **Verification:** Secret values stay out of manifests/logs; the Service sends traffic only to ready Pods under the selected check, and a dependency failure is diagnosable.
- **Mentor checkpoint:** Explain why liveness and readiness may disagree without either being wrong.

### P11 — Add Ingress and justified storage/multi-service operation (M5-M7)

- **Why OmexLive needs it now:** Frontend/API/Socket and media origins must be exercised together before claiming a production-like route topology.
- **What I should learn:** **Ingress → persistent storage where appropriate**, TLS/host routing, stateful restart, service discovery and rollout boundaries.
- **Prerequisites:** P09-P10, approved test ingress/cookie topology and a storage policy for any stateful workload.
- **Small hands-on exercise:** Route a test frontend and backend through one Ingress; verify a real authenticated API and Socket path. If a test MongoDB or HLS artifact store is put in-cluster, attach appropriate persistent storage and rehearse a restart.
- **Relevant OmexLive services/files:** docker-compose.yml; frontend/nginx.conf; backend/index.js; backend/src/sockets/index.js; media-service/index.js; media-service/src/services/hlsUploader.service.js.
- **What NOT to automate yet:** Do not move every service, expose MongoDB/Redis publicly, or force RTMP/HLS through an unvalidated HTTP Ingress. Keep media separate unless evidence changes that boundary.
- **Verification:** Cookies, CORS/CSRF, Socket.IO and any selected HLS path work under the test origins; stateful data survives the intended restart, and rollback is demonstrated.
- **Mentor checkpoint:** Explain which bytes use Ingress, which use a media origin, and which data require persistence.

### P12 — Consider centralized observability only for a real diagnosis gap (M5-M7)

- **Why OmexLive needs it now:** Cross-service stream/payment incidents may become difficult to explain from isolated container logs, but the need must be observed.
- **What I should learn:** Correlation IDs, structured logs, metric semantics/cardinality, useful alerts and sensitive-data redaction.
- **Prerequisites:** Existing per-service logs/health checks, P02 or P10/P11 operational experience, and a specific unanswered incident question.
- **Small hands-on exercise:** Trace one publish/heartbeat or top-up request across existing logs; write the exact missing signal. Trial a centralized log/metric path only if it materially improves that diagnosis.
- **Relevant OmexLive services/files:** backend/index.js; backend/src/controllers/StreamController.controller.js; backend/src/controllers/CoinController.controller.js; media-service/index.js; BACKEND_STANDARDS.md.
- **What NOT to automate yet:** Do not install a telemetry stack, dashboard or alert catalog just because Kubernetes exists; never log OTPs, JWTs, payment secrets or raw private prompts.
- **Verification:** The chosen signal answers the incident question with bounded cost and no sensitive leakage; otherwise record that existing logs suffice and defer tooling.
- **Mentor checkpoint:** Explain what an alert would tell an operator to do, rather than just what number crossed a threshold.

### P13 — Use Rancher after manifest and kubectl competence (M8)

- **Why OmexLive needs it now:** Once a selected Kubernetes workload is understood, a management view can help inspect cluster/workload state.
- **What I should learn:** Cluster/workload inventory, rollout visibility, access control and the relationship between declarative manifests and management UI.
- **Prerequisites:** P09-P11 have been operated through manifests and kubectl; Rancher access to the chosen test cluster is approved.
- **Small hands-on exercise:** Diagnose the same intentionally unhealthy test workload first with kubectl, then locate its rollout, events and configuration through Rancher.
- **Relevant OmexLive services/files:** P09-P11 OmexLive manifests when created; frontend/Dockerfile; backend/Dockerfile; docker-compose.yml as the baseline service map.
- **What NOT to automate yet:** Do not use Rancher clicks as the only deployment record or treat its UI as a replacement for Kubernetes primitives.
- **Verification:** The developer can reproduce the diagnosis and recovery from manifests/kubectl and explain what Rancher adds.
- **Mentor checkpoint:** Explain which source of truth should survive a lost Rancher session.

### P14 — Extend Jenkins to images, registry and bounded deployment (M8; R50/R51)

- **Why OmexLive needs it now:** Node v1 freeze and route rollback benefit from traceable images and a repeatable preview deployment.
- **What I should learn:** Image provenance, registry credentials, immutable references, deployment approval, health checks and rollback.
- **Prerequisites:** P06 green CI, P07 stable images, P09-P11 for a chosen Kubernetes target; P13 is useful but not required.
- **Small hands-on exercise:** Extend the same pipeline after test/build to **Docker image build → registry → bounded preview deployment**; deploy one changed service image, verify its route/health, then roll back.
- **Relevant OmexLive services/files:** future Jenkinsfile; backend/Dockerfile; frontend/Dockerfile; media-service/Dockerfile; docker-compose.yml; P09-P11 manifests when created.
- **What NOT to automate yet:** Do not auto-promote to production, rebuild unrelated services, or hide manual approval for a traffic or data change.
- **Verification:** Deployed image digest maps to a passing commit/contract suite; preview checks and rollback are repeatable and auditable.
- **Mentor checkpoint:** Explain why passing CI, publishing an image and shifting user traffic are three separate decisions.

### P15 — Reuse the platform concepts for Spring parity and cutover (M9; R52-R63)

- **Why OmexLive needs it now:** Spring must run beside a frozen Node reference long enough to compare behavior and rehearse rollback.
- **What I should learn:** Java image build, Jenkins contract stages, isolated environment configuration, Kubernetes rollout/Service routing and Rancher operational visibility if adopted.
- **Prerequisites:** R51 Node freeze, R52 first Spring slice, approved data/cookie/callback topology; P14 if Jenkins/Kubernetes is the selected deployment path.
- **Small hands-on exercise:** Build and deploy a Spring preview image, run the frozen Node contract fixtures against it in Jenkins, compare one public and one protected journey, then rehearse a bounded rollback. Use kubectl first and Rancher as a management view if available.
- **Relevant OmexLive services/files:** backend/index.js; backend/src/routes; media-service/src/config/mediaServer.config.js; docker-compose.yml; future Spring project, Jenkinsfile and Kubernetes manifests.
- **What NOT to automate yet:** Do not dual-write authoritative product data casually, switch all routes, merge media into Spring, or declare /api/v2 merely because implementation language changed.
- **Verification:** The preview reports fixture parity, data/provider identity checks, active-session handling and a documented cutover/rollback result; R63 remains the traffic gate.
- **Mentor checkpoint:** Explain how a payment or active broadcast stays safe if Spring traffic is rolled back to Node.

**Recommended first item: R01, with P01 beginning alongside it.** R01 classifies the existing stream test discrepancy; P01 then supplies a real Jest regression for R02's private-video request while the current runner remains available. P02 can run in parallel to learn the existing Compose stack. **Not yet:** install Keycloak, Jenkins, Kubernetes, Rancher or observability tooling; extract DDD layers, migrate routes to Next.js, build AI, start the Spring rewrite, or redesign the entire UI.
