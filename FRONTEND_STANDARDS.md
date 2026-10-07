# OmexLive Frontend Engineering Standards v1

**Status:** Target architecture specification for the future Next.js frontend. It governs new work and migration design; it does not authorize a route migration or a production refactor. **Design System authority:** [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) governs visual language and UI interaction contracts. This document governs engineering ownership and consumption of that system.

**Decision labels:** LOCKED means required for v1 planning and implementation. PROVISIONAL is a working choice awaiting product or design review. NEEDS VALIDATION requires a representative implementation or deployment test before it becomes a fixed rule. EXTERNAL ARCHITECTURE DECISION requires a hosting or backend decision outside this document. These labels are summarized in Section 30.

## 1. Engineering principles

1. Preserve existing product behavior, public URLs, authentication, payments, realtime participation, and media playback unless a separate product change is approved.
2. Give each concern one owner. Routes compose; features execute workflows; product modules express reusable OmexLive concepts; shared modules provide generic capabilities; the backend owns business and security decisions.
3. Choose data and state tools from the resource's lifetime and freshness needs. Every resource/view has **one explicit ongoing freshness owner**.
4. Render on the server by default. Add a Client Component boundary where interaction or browser runtime requires one; keep that boundary as small as practical.
5. Keep contracts explicit at the network boundary. Do not expose persistence-specific backend shapes as permanent presentation types.
6. Build on the Design System. Do not reproduce its primitives, tokens, accessibility behavior, or visual rules in feature code.
7. Prefer a navigable codebase over speculative layers, generic wrappers, or abstractions used once.
8. Make locale, accessibility, failure behavior, and operational cleanup part of feature design, not a final polish pass.

In this document, **must** is normative; **should** is the default with a documented exception; **may** describes an allowed option. Framework-specific behavior must be checked against the version selected at migration time.

## 2. Current frontend baseline and migration obligations

The current frontend is a React/TypeScript Vite SPA with React Router, Redux Toolkit, RTK Query, Socket.IO client, Hls.js, Plyr, Stripe Elements, and conventional CSS. This baseline is evidence for preserving behavior, not a target folder structure. Relevant anchors are:

| Existing concern | Current anchor | Migration obligation |
|---|---|---|
| Routes, shell, profile restoration, theme | frontend/src/App.tsx; frontend/src/main.tsx | Preserve routes and session UX while separating shell and route responsibilities. |
| Client cache and session snapshot | frontend/src/store/store.ts; frontend/src/store/slices/authSlice.ts; frontend/src/store/api/ | Preserve useful queries and mutations with safe Next.js store creation. |
| Cookie auth and OAuth return | frontend/src/components/Login/Login.tsx; frontend/src/pages/AuthCallback/AuthCallback.tsx; backend/src/utils/createToken.js | Preserve OTP/OAuth, cookie handling, redirects, and backend authorization. |
| Watch realtime and player | frontend/src/pages/WatchLive/hooks/useLiveStreamSocket.ts; frontend/src/pages/WatchLive/VideoPlayer/VideoPlayer.tsx | Preserve room presence, chat, reactions, recovery, and resource cleanup. |
| Economy and upload | frontend/src/pages/TopUp/TopUp.tsx; frontend/src/pages/WatchLive/DonateModal/DonateModal.tsx; frontend/src/components/UploadVideo/UploadVideo.tsx | Preserve Stripe confirmation, donation idempotency, multipart upload retry, and cache refresh. |
| Themes and responsive CSS | frontend/src/index.css; frontend/src/styles/responsive.css | Migrate to Design System tokens through a separate visual implementation review. |

The backend currently sets an HTTP-only JWT cookie and performs authorization. Its host/cookie topology is a deployment constraint for authenticated Next.js rendering. Current DTOs contain MongoDB-style _id fields and populated-or-ID relationships; the future frontend contract must isolate these representations. No current frontend test suite should be interpreted as complete behavioral coverage.

## 3. Target Next.js architecture

**LOCKED:** use the Next.js App Router and the following conceptual ownership:

| Layer | Owns | Does not own |
|---|---|---|
| app/ | Route files, layouts, metadata, route parameters, route-level loading/error/not-found surfaces, provider composition, server entry points | Entire product workflows, generic UI primitives, backend business rules |
| features/ | Complete user workflows: watch-live, watch-video, auth, creator-stream, upload, top-up, admin | Generic Design System controls or unrelated feature internals |
| product/ | Reusable OmexLive concepts, presentation and product-facing types: stream, video, creator, user, economy | Route navigation, one-off feature workflows, generic transport |
| shared/ | Design System, generic API transport, base realtime/media infrastructure, i18n infrastructure, configuration and framework-independent utilities | Product decisions, feature-specific endpoint behavior, route-specific styling |
| store/ | Client store factory and provider composition while Redux remains useful | A universal home for server state or business logic |

The boundary between a feature and product module is reuse of domain meaning, not file size. A stream card used by discovery and watch suggestions can live in product/stream; a moderation action specific to watch-live remains in that feature. Do not add another architectural layer without a concrete dependency problem it solves.

## 4. Folder structure

The target shape below is a guide, not a command to move existing files now:

~~~text
src/
  app/
    [locale]/
      layout.tsx
      (public)/home/page.tsx
      (public)/stream/[streamId]/page.tsx
      (public)/video/[videoId]/page.tsx
      (creator)/creator/live/page.tsx
      (admin)/admin/page.tsx
    providers/
  features/
    auth/
    watch-live/
    watch-video/
    creator-stream/
    upload-video/
    top-up/
    admin/
  product/
    stream/
    video/
    creator/
    user/
    economy/
  shared/
    ui/
    tokens/
    styles/
    api/
    realtime/
    media/
    i18n/
    config/
    lib/
  store/
~~~

Other routes and features follow the same pattern. The URL path remains the existing stable path even if a route group changes the on-disk folder. Route groups organize layout and access behavior; they do not rename product URLs. Subfolders such as api/, model/, components/, hooks/, and messages/ are added inside a module only when that module needs them.

Each folder must have an obvious owner. Place a function close to its only caller; promote it to product/ or shared/ after genuine reuse appears. Keep server-only and client-only code in separate files so imports make the runtime boundary visible.

## 5. Module and dependency rules

**LOCKED conceptual direction:** app → features → product → shared. app may also compose product and shared directly; features may use shared directly. shared never imports product, features, app, or store. product never imports features or app. Feature-to-feature runtime imports are forbidden by default; extract a genuine reusable product concept or shared capability instead. Circular runtime dependencies are forbidden.

store/ remains the composition root for client global state. Create a fresh store for each server request/rendered provider instance; never export a module-level server singleton. Feature Client Components may import typed Redux hooks from the narrow store/hooks public API; those hooks reference store types only and must not import a store instance at runtime.

If OmexLive adopts a shared RTK Query baseApi, its reusable infrastructure belongs under shared/api/baseApi, **not** store/. Feature and product endpoint modules may import that base API and extend/inject endpoints into it. store/ imports the shared base API to register its reducer and middleware alongside other client state. Feature/product modules must not import the runtime store instance or depend on store/ merely to define endpoints:

~~~text
features/* ───────→ shared/api/baseApi
product/*  ───────→ shared/api/baseApi
store/     ───────→ shared/api/baseApi
~~~

Do not create a features/* → store/ → features/* runtime cycle. If existing RTK Query API slices remain separate, store/ may register their reducers and middleware without making those endpoint modules depend on store/ at runtime. Whether existing API slices are consolidated is NEEDS VALIDATION, not a prerequisite for migration.

Expose each feature/product module through a small documented public entry point. Internal files remain private to the module. Prefer direct imports from that entry point; avoid giant barrels that import every module or create cycles. A shared alias such as @/ resolves from src/; aliases shorten paths but do not bypass dependency rules. Type-only imports still follow the conceptual boundary unless a migration adapter explicitly documents an exception.

## 6. Route architecture

A page.tsx file should parse and validate route parameters, select server-readable initial data where appropriate, generate or compose metadata, and render feature/product sections. layout.tsx owns shared page framing and providers. loading.tsx, error.tsx, and not-found.tsx handle route-level states; expected API failures remain explicit feature states. A route file must not become the home of HLS setup, socket listeners, chat, donation, moderation, or API mutation logic.

Preserve existing deep-link paths through migration: /home, /live, /game, /game/[gameId], /stream/[streamId], /video/[videoId], /profile/[userId], /channel/[userId], /search, creator/admin routes, and callback paths. Locale prefixes add /vi or /en without translating stable route segments in v1. Route params are untrusted input: validate before calling APIs or emitting metadata. Use URL search parameters for shareable search, filters, pagination, and meaningful tab selections; keep temporary panel visibility local.

Authenticated route redirects improve UX; they do not authorize backend data. An error boundary must not turn a 401, 403, 404, offline condition, or expected validation error into a generic crash screen. Do not assume a server route can read an authenticated session until Section 10's deployment condition is met.

## 7. Server and Client Component rules

**LOCKED:** Server Components are the default for route shells, static presentation, safe initial reads, and metadata. Client Components are required for event handlers, local interactive state, browser APIs, Socket.IO subscriptions, Hls.js/Plyr, Stripe Elements, browser uploads, and interactive forms. A route may compose a large client-heavy watch workflow; the route file itself remains a thin server entry when practical. Do not force realtime state into artificial server abstractions.

Place the use client directive at the smallest practical entry point. Its imported runtime graph joins the client bundle, so a provider, header, or player island must not import server-only code. Pass serializable DTO/product data across the server-to-client boundary, not class instances, functions, secrets, store instances, or browser objects. Browser-dependent libraries must not execute during server module evaluation; load heavy media/payment integrations when their feature is reached.

Server-only API clients and credentials must never enter a client import graph. Server Components must not read or write the Redux store. Client providers should wrap only the subtree that needs them where practical. Hydration must begin from the same locale, theme, and initial public data assumptions used by the server. Validate this partition on representative watch, creator, admin, and payment routes before generalizing it.

## 8. State ownership

Before adding state, classify it and record its owner:

| Category | Owner and rule |
|---|---|
| Server state | Backend is authoritative. A server fetch or RTK Query owns a particular view's ongoing freshness; Section 9 defines the handoff. |
| Authentication/session | Backend cookie and profile endpoint are authoritative. Client state is a minimal UX snapshot, never proof of authorization. |
| URL state | Route params/search params own shareable, navigable choices such as q, filters, pagination and durable tabs. |
| Local UI/form state | Owning Client Component or feature owns dialogs, drafts, touched/dirty state and selected controls. |
| Realtime state | Feature subscription owns transient room events; durable resources reconcile with the query owner. |
| Media/player state | Player instance and owning media feature hold playback position, quality, recovery and controls. |
| Persistent preferences | Locale/theme source must be readable at initial render where feasible, then synchronized with client controls. |

Redux is justified for globally shared mutable client state or RTK Query's client cache, not as a default destination for every state value. Do not mirror the same server resource into an unrelated Redux slice merely to display it elsewhere. Ephemeral dialog visibility stays local unless a real cross-route workflow requires broader ownership. When a route changes, route-specific state must either derive from the URL or reset deliberately.

## 9. Data fetching and API layer

**LOCKED:** retain Redux/RTK Query with a smaller explicit role. Server fetching handles suitable public initial reads and metadata. RTK Query handles interactive client-owned server state, authenticated workflows, polling, mutations and cache invalidation where appropriate. Socket.IO supplies events and presence; it does not become an unrelated durable source of truth.

Every resource/view must name **one ongoing freshness owner**:

| Need | Default owner | Handoff |
|---|---|---|
| Public stream/video/channel initial content and metadata | Request-scoped server fetch with an explicit cache policy | Pass serializable initial view data; if live client updates are required, define when client query takes over. |
| Authenticated interactive dashboard, wallet, admin list or notification list | RTK Query client cache | Server-render only after session topology is approved; avoid an independent long-lived server cache for the same personalized view. |
| Live count, chat, reactions and presence | Socket feature subscription | Keep transient high-frequency state local; update or invalidate the related query for durable fields. |
| Mutations | Backend API via the owning feature's API module | Invalidate/update precisely owned client caches and any affected server route data. |

Do not fetch the same initial resource once on the server and again on hydration without a documented reason. Server props are an initial snapshot, not automatic RTK Query hydration. If a client query becomes the freshness owner, use a deliberate initial-data or revalidation policy and test for stale flashes. Avoid caching personalized, admin, wallet or session responses in a shared server cache. Public caching and revalidation must be explicit; do not rely on framework defaults. Live data must have a short or uncached policy appropriate to its semantics. Server revalidation and RTK Query invalidation are separate mechanisms; a mutation that affects both render paths must coordinate both. If multiple RTK Query API slices remain, invalidation in one slice does not automatically refresh another; cross-slice refresh must be explicit.

The backend API is the business authority. Centralize request configuration and response/error normalization in shared/api. Endpoint definitions, DTOs and mutations belong with their owning feature or product module. Type requests and responses; validate untrusted response boundaries where failure has material impact. A server client is request-scoped and may forward an approved session only under Section 10. Browser requests include credentials as required by the backend. Never log tokens, stream keys, payment secrets, or sensitive response bodies.

Use AbortSignal/cancellation for obsolete reads and uploads where supported. Set timeouts by request class; surface timeout and offline distinctly. Retry safe/idempotent reads with bounded backoff when useful; do not blindly retry payments, donations, deletes or stream-start/end commands. Mutations that can be repeated must use backend-supported idempotency. A generic API error model should retain HTTP status, stable backend code, field errors, retryability and a safe fallback; map it to localized product copy. Do not make free-form backend message text the only UI contract.

Multipart uploads may use Axios or another transport if progress, cancellation, or retry behavior requires it. That exception still uses centralized API configuration, typed responses, normalized errors, size/type validation, and explicit cache invalidation. Avoid routing large media files through Next.js solely for architectural symmetry. Route Handlers or Server Actions may provide a narrowly reviewed session/transport bridge, but must not duplicate backend business rules, validation authority, payments or persistence.

## 10. Authentication, session and authorization

**LOCKED:** the backend authenticates users and authorizes every protected resource and action. Frontend guards are navigation UX, not security. Current behavior includes credential + OTP login, an HTTP-only JWT cookie, profile restoration, Google OAuth callback, logout, admin role checks, and anonymous public viewing; migration must preserve these flows.

Authenticated Server Component reads are permitted only after an approved deployment/session topology safely makes the incoming session available to Next.js. The current backend cookie is host-only; a separate frontend host cannot assume it receives that cookie. **The final frontend/API host and cookie/session topology is an EXTERNAL ARCHITECTURE DECISION.** Until it is resolved, protected interactive surfaces may restore the session client-side using the backend profile endpoint. Never expose the HTTP-only JWT to browser JavaScript to enable SSR; do not build a second authentication system in Next.js.

Treat 401 as unauthenticated/expired according to the backend contract, 403 as authenticated but forbidden, and network/5xx as unknown or temporarily unavailable. A transient profile failure must not be silently equated with logout. On login/OAuth success, refresh the profile and affected client caches before showing protected information. On logout, call the backend endpoint, clear client session/cache, stop or reauthenticate sockets, and redirect to a public locale path; reconcile failures explicitly. An inactive/banned user may lose access at any time; backend responses and socket rejection govern the result.

Protected route rendering must not leak personalized HTML, RSC payloads, metadata or cached fetch results to another user. Admin UI checks reflect backend role data but never replace backend role enforcement. OAuth callback URLs and cookie delivery must be tested under the final host topology. Socket.IO may allow anonymous viewing, while chat/moderation permissions follow backend socket authentication and authorization.

## 11. Internationalization

**LOCKED:** initial locales are Vietnamese (vi) and English (en), with explicit /vi/... and /en/... URL prefixes under app/[locale]. Path segments remain stable in v1: /vi/stream/123 and /en/stream/123 refer to the same resource. Do not translate route slugs. The locale in an explicit URL wins over cookies and browser preferences. For an unprefixed entry, resolve a persisted preference, then Accept-Language/browser language, then **PROVISIONAL vi**. Redirect to the canonical prefixed URL without losing its path or query. Validate unsupported locale segments instead of rendering an accidental third language.

Render the selected language in html lang and server content on first response. Persist the immediate preference in a first-party, server-readable locale cookie containing only vi or en; an optional account preference may be synchronized later. A locale switch must preserve resource ID, path, search params and relevant hash where possible; it must update the URL and cookie, and refresh translated content without losing essential form/control state or focus. Centralize locale-aware internal link generation, including backend-provided notification destinations and OAuth/payment return paths. Stored preference must not override an explicit locale URL. Do not mistake country selection for language selection.

Features own their translation resources; a small shared/common resource set covers reusable navigation, controls and state labels. Use stable semantic keys such as watchLive.chat.send, not English sentences as keys or one enormous flat file. Keep vi/en key parity, documented interpolation variables, escaping, and plural rules. A formatter may use an ICU-capable library after evaluation, but no library is prescribed in this phase. Product components receive localized content or a narrow translation capability without importing route files. Backend error codes map to localized UI copy; user-generated content is not translated automatically.

Use Intl and the chosen locale for dates, numbers, relative time and currency presentation. Treat timestamps as explicit instants and display the intended time zone for schedules. Money must carry its actual currency; never infer currency from locale or recalculate authoritative amounts in the browser. Localize accessibility names, validation copy, player labels and metadata. User-facing product copy must not be scattered as hardcoded strings. All engineering implementations must satisfy the translation expansion, wrapping, overflow, Vietnamese diacritic and runtime-switching rules in DESIGN_SYSTEM.md.

## 12. Theme

Design System semantic tokens are the only source of visual color values. Theme preference has three states: light, dark and system. A persisted preference should be server-readable when practical so the initial HTML and hydrated UI agree. When preference is system, CSS media queries can resolve the browser color scheme before interaction; a minimal pre-paint mechanism may be used if validated to prevent visible flashing. Do not make localStorage the sole source of initial server-visible theme.

Apply the resolved theme and color-scheme at the document shell, not separately in every feature. The toggle updates preference, the document theme, and persistence consistently. A live system-preference change must be reflected when system mode is selected. Test first load, reload, navigation, locale change and hydration for both themes. The exact persistence mechanism is NEEDS VALIDATION with the final session/deployment topology.

## 13. Realtime architecture

shared/realtime owns browser-only Socket.IO connection creation, transport options, authentication refresh and connection health. A feature owns event meaning, room subscription, moderation behavior and UI state. Components must not casually create independent sockets. No socket instance may be created at module scope in a Server Component import graph.

One connection manager per browser session should support reference-counted or otherwise explicit consumers. Joining a stream room registers named listeners before emitting the join; leaving removes exactly those listeners and its heartbeat/timers. A consumer must not disconnect a connection still used by another feature. On reconnect, reauthenticate under backend rules, rejoin active rooms, and reconcile any state missed while offline. Do not assume a socket event was delivered exactly once or in perfect order; deduplicate by stable event ID where necessary. Bound chat/reaction buffers and clean them on route change.

High-frequency presence and reactions stay feature-local unless a concrete shared consumer requires broader state. Durable stream status, notification totals, balance and moderation results reconcile with RTK Query through targeted cache updates or invalidation. Specify the owner of each event-to-query mapping. Show a distinct reconnecting/offline state where it affects user action. Anonymous viewers may connect where the backend allows it; chat and moderation remain backend-authorized. Validate behavior under remount, React Strict Mode, rapid stream switching, auth changes, lost connection and multiple tabs.

## 14. Media and player

shared/media may own generic player setup, HLS capability checks, recoverable errors and teardown. Product/stream or a watch feature owns stream-specific playback rules and presentation. The player is a Client Component; load Hls.js/Plyr only on media routes where practical. Keep the video element usable with native HLS when supported and Hls.js when appropriate. Do not initialize a player on the server.

On URL change or unmount, stop timers, destroy HLS/player instances, release media references and prevent stale callbacks from updating the new stream. Distinguish autoplay blocked, stream not ready, recoverable network error, unsupported browser and ended/offline states. Retries are bounded; a terminal error offers a meaningful next action. Playback position, mute, quality and fullscreen belong to the player/feature, not generic Design System state. Honor captions/subtitles and keyboard controls when available; provide accessible names and text for failures. Validate the actual CDN/HLS CORS, credential and media-origin behavior in the migration environment.

## 15. Payments and economy UI

Stripe Elements and payment confirmation UI are client-only. The backend creates intents, defines packages/prices, confirms outcomes, updates balances and owns idempotency and fulfillment. The frontend must never treat a client-side Stripe success signal alone as proof of credited coins. A top-up flow preserves selected package, intent identity, pending state, redirect return/recovery, backend confirmation and the refreshed balance. On reload or uncertain response, reconcile with backend status before declaring success or retrying a charge.

Disable duplicate submits while pending and reuse backend-supported idempotency keys for repeatable donation attempts. A retry must not create an unintended second donation or payment. Distinguish payment failure, backend confirmation delay, insufficient balance and offline state. Payment errors remain next to the task, not only in a toast. Keep Stripe publishable configuration client-visible and secret keys server/backend-only. Do not put card data or payment business rules in Redux, Next.js Route Handlers, Server Actions or logs.

## 16. Forms and validation

The owning feature controls form draft, touched/dirty state, field rules and submission lifecycle. Design System FormField, Input and other primitives own presentation and accessibility. Use native input constraints where helpful, but backend validation and authorization remain authoritative. Client validation should give early feedback for deterministic rules such as required fields and file size/type; it must not attempt to reproduce mutable backend policy.

On submit, prevent duplicates, preserve entered values after failure, map backend field errors to their fields, show form-level errors for request or cross-field failures, and focus or announce the first actionable error. A retry should retain the draft and explain whether the previous operation may already have succeeded. Multi-step auth, upload and payment forms must preserve the intended step across expected errors. Do not use a toast as the only explanation of a failed submission.

No form library is selected for v1. Evaluate one only if repeated form-state, schema or field-error handling creates measured duplication across real features; record the problem, bundle impact, accessibility behavior and migration cost before adding it.

## 17. Error, loading, empty and recovery states

Use these meanings consistently:

| State | Engineering response |
|---|---|
| Loading | Preserve expected content geometry; announce a long wait once, not on every rerender. |
| Empty | A successful response with no items; explain the state and offer an action only when useful. |
| Recoverable error | Keep the feature shell and data already safe to show; provide a scoped retry. |
| Fatal/unexpected error | Route error boundary with a safe fallback and diagnostic logging without secrets. |
| 401 unauthenticated | Restore or request login; preserve intended destination where safe. |
| 403 forbidden | Show access denial; do not imply the resource is missing unless backend policy requires concealment. |
| 404 not found | Use route not-found behavior for a truly missing public resource. |
| Offline/reconnecting | Preserve local draft and indicate delayed actions or stale realtime state. |

The API layer classifies transport and HTTP errors; features choose task-specific copy and retry; route boundaries catch uncaught failures. Field errors stay with fields, persistent failures use an inline Alert/ErrorState, and Toast is for brief nonblocking feedback. Never render private error details or stack traces to users. A query error must not automatically erase a valid session. Test loading-to-success, loading-to-empty, retry, failed mutation and interrupted network transitions.

## 18. Design System integration

DESIGN_SYSTEM.md is authoritative for Quiet Broadcast, semantic tokens, component behavior, accessibility, localization resilience and content-first/anti-plastic rules. Frontend code consumes those rules; this document does not restate or change the visual design.

shared/ui owns generic presentation and interaction contracts and must not import routes, Redux, RTK Query, Socket.IO, Stripe, backend DTOs or product APIs. Product modules compose shared/ui into reusable OmexLive patterns such as StreamCard or LiveBadge usage. Features combine those patterns with queries and workflows. Do not clone an existing shared primitive locally, add raw colors when a semantic token exists, or create a new variant solely for one route. Route-specific styling belongs with the route/feature, not in shared/ui. A feature may request a Design System change through governance with a recurring semantic need and accessibility review.

## 19. TypeScript standards and API contracts

Keep strict TypeScript enabled. Prefer inferred local types and explicit public boundaries. Use unknown for untrusted caught errors and parse/narrow before use; avoid unnecessary any and assertions that merely silence untyped API responses. Optional and nullable fields must represent real contract states; do not use non-null assertions for route params or asynchronous data without validation. Use discriminated unions for meaningful workflow states such as idle/pending/succeeded/failed when they prevent impossible combinations. Prefer string unions over enums unless interoperability requires an enum. Generic components need real cross-feature reuse.

Define transport DTOs beside the endpoint that receives them. Keep product-facing types free from Mongoose documents, MongoDB _id assumptions and populated-or-ID union fields. Normalize persistence-specific representations at an API boundary where they otherwise leak into several consumers; do not add mapping layers for identical simple data with no boundary value. Treat backend-provided IDs as opaque strings in the UI. The Node/MongoDB to Spring Boot/relational migration should preserve an agreed API contract or require one adapter change, not presentation rewrites.

Runtime validation is warranted at trust boundaries with material consequences: auth/session, payment/economy amounts, stream permissions/keys, upload responses, and external event payloads. TypeScript alone does not validate network data. Document versioned API contract changes and test the adapter against both backend generations when transition begins.

## 20. Naming, imports and file conventions

Use PascalCase.tsx for React components, camelCase.ts for hooks/utilities/API modules, and kebab-case for route segments and feature/product folders. Hooks begin with use; tests use the source filename plus .test.ts or .test.tsx beside the module or in a nearby __tests__/ directory. Translation files are named vi and en within the owning module's messages/ directory. DTO types end in Dto when that suffix clarifies the transport boundary; product types use business names. Query/mutation names describe resource and action, for example getStreamById and endStream.

Use one alias rooted at src/ for cross-module public imports and relative paths inside a module. Do not import another module's private subfolder. Avoid wildcard barrels, runtime circular imports and files that aggregate unrelated concepts. A type-only import is marked as such. A module entry point exports only its supported interface; migration adapters are explicitly named and retired after their callers move.

## 21. Performance

Prioritize visible video/discovery content, route responsiveness and stable playback. Keep client bundles small by leaving route shells on the server and loading Hls.js/Plyr, Stripe Elements and heavy creator/admin tools only on routes that need them. Split by route/feature before micro-optimizing individual components. Do not create one global client provider that imports all features.

Serve thumbnails at the rendered size with appropriate responsive variants and lazy-load below-the-fold media; reserve geometry to avoid layout shifts. Treat the main video stage differently from decorative images and avoid delaying playback behind nonessential data. Keep chat/reaction lists bounded; virtualize only when measured volume warrants it. Select narrow RTK Query subscriptions and avoid accidental rerenders from high-frequency socket events. Poll only resources that need it, pause or slow polling when hidden, and avoid parallel polling and socket updates for the same data without an explicit owner.

Set an explicit cache and revalidation policy for every server fetch; public metadata can be cached differently from live status. Measure actual route JavaScript, LCP, interaction delay, playback startup, buffering and error recovery on representative devices before changing strategy. No arbitrary global performance optimization is required without evidence.

## 22. SEO and metadata

**LOCKED:** only explicitly public resources may be indexable or emitted into public metadata. Metadata reads must use the same visibility rules as the page and must not expose private/unlisted streams, videos, profiles, admin data, payment data or stream keys. Unavailable or forbidden resources use an appropriate not-found/noindex policy consistent with backend access rules. Never put personalized API responses in a public server cache.

Public stream, video, creator/channel and discovery routes should have a meaningful localized title and description, canonical URL, locale alternatives, Open Graph/share image and resource-specific metadata when the backend exposes safe public fields. Share previews may need a stable fallback image if a thumbnail is missing. A live stream's status and an ended stream's indexability require an explicit product policy; metadata must not claim LIVE from stale data. Exact indexing policy is NEEDS VALIDATION with product approval. Use one metadata builder at the route/product boundary rather than ad hoc tags scattered through Client Components.

## 23. Accessibility engineering

Implement the accessibility contracts in DESIGN_SYSTEM.md using semantic HTML and native controls first. Every route and feature must work with keyboard navigation, visible focus, correctly labelled forms, accessible dialogs/menus/tabs, reduced motion, 200% zoom and both locales. Route changes should provide a coherent focus/heading experience. Live regions announce meaningful changes without flooding assistive technology; rapid chat, reactions and viewer counts need throttling or user-controlled announcements.

Player controls need names, keyboard access, error text and captions when available. Payment and upload progress require understandable status, including after redirects or retry. Locale switching updates document language and translated accessible names. Accessibility checks belong in component and route tests, manual keyboard review and representative screen validation throughout migration; they are not deferred to a final QA pass.

## 24. Testing architecture

Test behavior at the narrowest useful level, then cover critical journeys end to end:

| Level | What it proves |
|---|---|
| Unit | Pure formatters, DTO normalization, URL/locale helpers, state transitions and error classification. |
| Component/hook | Form feedback, tabs/dialog focus, player lifecycle, socket subscribe/unsubscribe and cache synchronization with controlled dependencies. |
| API/contract | Request credentials, DTO mapping, error codes, upload retry, idempotency and v1/v2 backend compatibility contracts. |
| Route/integration | Parameter validation, server/client handoff, personalized-cache isolation, protected-route UX, locale/theme hydration and metadata visibility. |
| End to end | Login/OTP/OAuth return, protected/admin access, locale switch, stream watch/chat, creator start/end, top-up/donation, upload and destructive admin actions. |

Mock transport boundaries for deterministic cases, but run representative integration tests against a real backend or contract fixture before cutover. Simulate offline/reconnect, 401/403/404, duplicate submits and route changes during playback. A route is not migrated until its critical journey passes in vi/en, light/dark where relevant, keyboard navigation, and the approved browser/device matrix. Optimize for confidence, not test count. Select any new test tooling in a separate implementation phase.

## 25. Environment and configuration

Centralize and validate configuration. Server-only API origins, service credentials and secrets are read only by server modules and never use a NEXT_PUBLIC_ prefix. Browser-visible API/Socket origins, CDN origins and Stripe publishable key may use NEXT_PUBLIC_ variables, with the understanding that their values enter client bundles. Example names such as BACKEND_API_URL, NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SOCKET_URL and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY are PROVISIONAL until deployment design is fixed.

Do not scatter process.env reads through features. Validate required values for the selected environment and fail clearly at startup/build when a critical value is absent. Do not default production to localhost. Record allowed frontend, backend, media and OAuth origins for each environment. If one build artifact is promoted between environments, validate how browser-visible build-time values are supplied. Never put Stripe secret keys, JWT signing secrets, stream keys or internal agent secrets into client configuration.

## 26. Security-related frontend rules

Render untrusted user text through React's escaped text path. Any HTML rendering requires a justified sanitizer and a documented trusted content source. Validate/allowlist user-provided media and external URLs before using them in navigation or embeds; external new-tab links use safe opener behavior. Avoid logging credentials, stream keys, OTPs, payment client secrets, card data and private responses. Public pages and metadata fetch only data authorized as public.

Keep the JWT HTTP-only. Credentialed mutations require backend-enforced CSRF/origin protections appropriate to the approved cookie topology; SameSite alone is not a complete business authorization check. The frontend sends only the credentials it is meant to send and does not grant roles from UI state. Upload controls check type/size for UX, but backend validates the file and permissions. Stripe Elements handles card entry; frontend never stores raw card data. Next.js server code must not cache one user's response for another user or serialize server secrets to Client Components.

## 27. Migration strategy

**Leading strategy:** route-by-route cutover supported by feature-by-feature extraction, with the current Vite frontend and future Next.js frontend running in parallel during transition. This requires explicit public URL ownership at a gateway/reverse proxy or equivalent deployment layer; two frontends must not both claim the same path without a routing plan. If route-level traffic splitting cannot preserve session and callback behavior safely, use a separate preview origin for validation and cut over a bounded route group only after the host topology is approved. The exact sequence is PROVISIONAL and the gateway/session topology is an EXTERNAL ARCHITECTURE DECISION.

Recommended controlled sequence:

1. Freeze an inventory of existing URLs, query parameters, OAuth callback URLs, Stripe return paths, API/cookie origins, and critical behaviors. Set parity tests and rollback criteria.
2. Build Design System foundations and the target module skeleton in the new frontend. Define the API contract and transport boundary without moving current production files.
3. Establish locale-prefixed canonical URLs, redirect rules, theme behavior, public metadata and public route rendering. Keep legacy unprefixed deep links working through redirects or gateway mapping.
4. Migrate lower-risk public discovery/channel/video reads, then watch-live with player and realtime parity. Confirm server/client cache handoff and no duplicate sockets before increasing traffic.
5. Resolve and validate the session/cookie topology before authenticated SSR. Migrate auth/OAuth, creator/upload, economy/Stripe and admin workflows in guarded increments. Client-side session restoration remains valid where server session access is unavailable.
6. Move route traffic only after functional, locale, accessibility, performance and security gates pass. Keep a route-level rollback to the Vite implementation until production telemetry is stable; retire adapters and old routes deliberately.

Do not combine framework migration, backend v2 contract migration and the full visual redesign into one unreviewable rewrite. Apply DESIGN_SYSTEM.md as each migrated screen is validated, while preserving task behavior. Preserve stream/video URLs, authenticated behavior, chat presence, payment return and idempotency, and media playback across cutover. No migration work is authorized by this standards document alone.

## 28. Engineering governance checklist

Before adding a component:

1. Check DESIGN_SYSTEM.md and shared/ui; then product components; then the owning feature. Create a new abstraction only for a distinct recurring meaning or behavior.

Before adding state or data access:

2. Classify state using Section 8; name the freshness owner using Section 9. Explain any new global Redux state, polling, or second cache.
3. Use the owning endpoint module and shared transport rules. Define DTO, error and invalidation behavior before a mutation ships.

Before adding a runtime boundary or dependency:

4. State the browser capability requiring use client; keep imports and providers scoped.
5. Check the dependency direction and public entry point. Do not add a feature-to-feature runtime import or a shared-to-product import.

Before release:

6. Check vi/en text and formatting, Design System consumption, keyboard/focus and error/loading/empty behavior.
7. Verify auth/visibility, sensitive-data handling, socket/player cleanup, payment/upload retry and route rollback where applicable.
8. Update the relevant contract, decision status and behavior tests when a provisional or validated rule changes.

An exception records its owner, concrete reason, affected routes, tests and removal condition. Temporary migration adapters are tracked and removed, not normalized into permanent architecture.

## 29. Current → target mapping

This mapping is a planning aid for migration, not an instruction to move files now. Each target is an ownership example; names may change if the boundary remains intact.

| Current file(s) | Candidate target owner | Reason |
|---|---|---|
| frontend/src/App.tsx; frontend/src/main.tsx | app/[locale]/ layouts, route files and providers | Split route composition, session/theme provider and route-level states. |
| frontend/src/pages/Home/; frontend/src/pages/Live/; frontend/src/pages/Game/; frontend/src/pages/Search/ | app/[locale]/ public route entries; features/discovery or product/stream/video presentation | Keep route files thin; give public reads, search URL state and reusable media patterns clear owners. |
| frontend/src/pages/Channel/; frontend/src/pages/Profile/ | app/[locale]/ public/profile route entries; product/user and feature profile editing | Separate public identity display from owner-only mutations and local tabs. |
| frontend/src/pages/Dashboard/; frontend/src/components/NotificationBell/ | features/creator-analytics and features/notifications | Keep authenticated polling and interactive status near their workflows. |
| frontend/src/routes/ProtectedRoute.tsx | app/ route UX guard plus features/auth session behavior | Guard is UX; backend still authorizes. |
| frontend/src/layout/Header/; frontend/src/layout/Footer/ | app/ shell composition; shared/ui primitives; feature controls where needed | Separate navigation shell from auth, search, theme and notification behavior. |
| frontend/src/store/store.ts; frontend/src/store/slices/authSlice.ts | store/ factory/provider; features/auth client snapshot | Avoid a server-global store and keep session authority at backend. |
| frontend/src/store/api/userApi.ts; frontend/src/store/api/videoApi.ts; frontend/src/store/api/streamApi.ts; frontend/src/store/api/coinApi.ts; frontend/src/store/api/notificationApi.ts; frontend/src/store/api/adminApi.ts | Owning feature/product api/ modules, composed in store/ | Preserve RTK Query behavior while moving endpoint ownership near consumers. |
| frontend/src/store/api/donationApi.ts | Economy API contract review | Currently outside store registration and uses a divergent fallback URL; reconcile only if its endpoints remain needed. |
| frontend/src/config/api.ts; frontend/src/utils/axios.ts | shared/config and shared/api | One typed transport/config/error policy; multipart adapter remains possible. |
| frontend/src/utils/socket.ts | shared/realtime | Browser connection ownership and credentials. |
| frontend/src/pages/WatchLive/WatchLive.tsx; frontend/src/pages/WatchLive/hooks/useLiveStreamSocket.ts | features/watch-live | Watch workflow, room subscriptions, chat and moderation. |
| frontend/src/pages/WatchLive/VideoPlayer/VideoPlayer.tsx | shared/media engine plus product/stream or feature player adapter | Player is reused by viewing and creator workflows; avoid a page-to-page import. |
| frontend/src/pages/WatchVideo/WatchVideo.tsx; frontend/src/components/ClipCreator/ | features/watch-video; product/video for reused presentation | Keep playback, comments, reactions and clipping in the owning workflow. |
| frontend/src/components/Login/; frontend/src/components/Register/; frontend/src/pages/AuthCallback/ | features/auth | OTP, recovery, OAuth restoration and localized auth UI. |
| frontend/src/components/GoLiveModal/; frontend/src/components/ScheduleModal/; frontend/src/pages/CreatorLive/ | features/creator-stream | OBS setup, scheduling, stream key, status and creator tools. |
| frontend/src/components/UploadVideo/UploadVideo.tsx | features/upload-video | Browser file handling, retry and explicit video cache refresh. |
| frontend/src/pages/TopUp/TopUp.tsx; frontend/src/pages/WatchLive/DonateModal/ | features/top-up and watch-live/economy composition | Keep payment and donation workflows distinct while sharing economy contracts. |
| frontend/src/pages/Admin/ | features/admin | Admin queries, mutations and tab content with backend authorization. |
| frontend/src/types/index.ts; frontend/src/utils/format.ts | DTOs with endpoint owners; product types and shared formatters | Remove permanent backend persistence shapes from presentation. |
| frontend/src/index.css; frontend/src/styles/responsive.css | shared/tokens, shared/styles and route/feature CSS | Migrate visual values under DESIGN_SYSTEM.md, with populated-screen validation. |

## 30. Open decisions and status register

| Status | Decision | Closure |
|---|---|---|
| **LOCKED** | App Router conceptual layers and app → features → product → shared direction; feature-to-feature runtime imports forbidden by default. | Enforce in review and module-boundary checks. |
| **LOCKED** | Redux/RTK Query retained for explicit client roles; one ongoing freshness owner per resource/view; Socket.IO reconciles durable queries. | Document owner in each migrated feature. |
| **LOCKED** | Server Components by default with small Client Component leaves where runtime requires them. | Review representative route module graphs. |
| **LOCKED** | /vi and /en URL prefixes with stable v1 path segments; explicit URL locale wins; feature-owned translations. | Verify deep links and runtime switching. |
| **LOCKED** | Backend remains business, authentication and authorization authority; frontend route guards are UX. | Contract and protected-route checks. |
| **LOCKED** | DESIGN_SYSTEM.md authority and shared/ui independence from routes, state, sockets, Stripe and product APIs. | Component and dependency review. |
| **LOCKED** | Frontend types isolate persistence-specific backend shapes; only explicitly public resources may enter indexable metadata. | DTO/visibility contract review. |
| **PROVISIONAL** | vi fallback for unprefixed entry; exact public-to-protected route migration order; example environment names and theme persistence mechanism. | Product/deployment review and route pilots. |
| **NEEDS VALIDATION** | Server/client initial-data handoff, public cache TTLs, RTK Query endpoint composition, socket multi-consumer lifecycle, media/CDN behavior, payment returns, locale/theme hydration, and exact public indexing policy. | Representative route implementation, contract tests and product approval where relevant. |
| **EXTERNAL ARCHITECTURE DECISION** | Production frontend/API host, cookie/session scope and any approved gateway/session bridge; public URL traffic ownership during parallel cutover. | Approved deployment diagram and end-to-end auth, OAuth, socket and rollback tests. |

The production host/cookie decision is a gate for authenticated server reads; it is not a reason to expose the JWT or to duplicate backend authentication in Next.js. Exact migration sequence and indexability policy remain open until the responsible product and deployment owners approve them.

### Framework references (informative)

- [Next.js App Router: Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js internationalization guide](https://nextjs.org/docs/app/guides/internationalization)
- [Next.js cookies API](https://nextjs.org/docs/app/api-reference/functions/cookies)
- [Next.js fetch and cache options](https://nextjs.org/docs/app/api-reference/functions/fetch)
- [Redux Toolkit setup with Next.js](https://redux.js.org/usage/nextjs)
- [HTTP Set-Cookie Domain behavior](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)
