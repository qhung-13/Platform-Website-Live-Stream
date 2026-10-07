# OmexLive Design System v1

**Status:** Draft for product and engineering review. This document defines the intended UI language and component contracts. It does not prescribe a UI library or a framework migration. The current OmexLive logo is temporary artwork for v1 exploration; its colors do not constrain the palette, and this phase does not redesign it.

## 1. Design philosophy

**Quiet Broadcast is the official v1 design direction.** It is a content-led visual language for a livestream and video product. Streams, video frames, thumbnails, avatars, creators, and conversation carry the visual interest. Navigation and controls remain clear and restrained. Typography, spacing, alignment, and image composition establish hierarchy before color or effects.

The viewer experience should be easy to scan and immersive when watching. Creator tools may be denser and more operational. Admin tools may be denser still. All three use the same foundations, controls, focus behavior, and status meanings.

Use one unmistakable LIVE signal. Reserve warm gold for coins and donation context, and muted teal for analytics context. Use neutral actions for routine work. Avoid decorating every block with a card, icon, badge, shadow, or gradient.

## 2. Color foundations

### Primitive palette

Primitive colors are raw ingredients. Feature code consumes semantic tokens below, not these values directly. The palette is deliberately small.

| Family | Steps | Intended role |
|---|---|---|
| Neutral | `#FFFFFF`, `#F7F8FA`, `#F0F3F6`, `#E9EDF1`, `#D8E0E7`, `#A9B6C2`, `#63717E`, `#52606D`, `#394653`, `#222D38`, `#19212A`, `#10151B` | Page, surfaces, text, borders, and neutral actions. |
| Live red | `#FBE9ED`, `#B51F3A`, `#FF6478` | Genuine live state and explicit Go Live action. |
| Economy gold | `#FFF6E7`, `#80561B`, `#3A2D19`, `#F5C86F` | Coins and donations only. |
| Analytics teal | `#E8F4F3`, `#176E72`, `#183436`, `#82D1CB` | Data emphasis when it aids interpretation. |
| Supporting state | light success `#26734D`, warning `#825B13`, danger `#B8323C`, info `#235F8D`; dark success `#75C69B`, warning `#F3C46B`, danger `#FF8B91`, info `#8BC4F1` | Feedback and validation. |

### Semantic color tokens

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--color-page` | `#F7F8FA` | `#10151B` | Main page canvas. |
| `--color-surface` | `#FFFFFF` | `#19212A` | Controls, panels, and elevated content. |
| `--color-elevated` | `#FFFFFF` | `#222D38` | Popovers and dialogs. |
| `--color-subtle` | `#F0F3F6` | `#151D25` | Quiet grouping and hover surfaces. |
| `--color-stage` | `#0A0D12` | `#0A0D12` | Video stage; independent of page theme. |
| `--color-text-primary` | `#17212B` | `#F2F5F7` | Main text and headings. |
| `--color-text-secondary` | `#52606D` | `#B7C2CD` | Supporting descriptions. |
| `--color-text-muted` | `#63717E` | `#9AA8B5` | Metadata that must remain readable. |
| `--color-text-on-stage` | `#FFFFFF` | `#FFFFFF` | Text over darkened media. |
| `--color-border-subtle` | `#E9EDF1` | `#29333E` | Dividers and low-emphasis separation. |
| `--color-border-default` | `#D8E0E7` | `#394653` | Inputs and surfaced containers. |
| `--color-border-strong` | `#A9B6C2` | `#657584` | Selected or strong structural boundaries. |
| `--color-focus` | `#1D6DB3` | `#8BC4F1` | Keyboard focus indicator, independent of brand status. |
| `--color-action-primary` | `#202D3A` | `#F0F3F5` | Primary action where no domain color is needed. |
| `--color-action-primary-hover` | `#354656` | `#D9E1E8` | Hover state for the primary action. |
| `--color-action-on-primary` | `#FFFFFF` | `#10151B` | Label on primary action. |
| `--color-action-secondary` | `#EEF2F5` | `#2A3642` | Secondary control fill. |
| `--color-link` | `#235F8D` | `#8BC4F1` | Text links and navigation when a color cue is needed. |
| `--color-live` | `#B51F3A` | `#FF6478` | LIVE dot and live text. |
| `--color-live-surface` | `#FBE9ED` | `#40212D` | Quiet live context. |
| `--color-live-on-solid` | `#FFFFFF` | `#10151B` | Label on solid LIVE badge. |
| `--color-economy` | `#80561B` | `#F5C86F` | Coin and donation emphasis. |
| `--color-economy-surface` | `#FFF6E7` | `#3A2D19` | Economy context background. |
| `--color-analytics` | `#176E72` | `#82D1CB` | Chart/data emphasis. |
| `--color-analytics-surface` | `#E8F4F3` | `#183436` | Analytics context background. |
| `--color-success` | `#26734D` | `#75C69B` | Successful completion. |
| `--color-warning` | `#825B13` | `#F3C46B` | Caution that still permits action. |
| `--color-danger` | `#B8323C` | `#FF8B91` | Error and destructive action. |
| `--color-info` | `#235F8D` | `#8BC4F1` | Neutral system information. |
| `--color-scrim` | `rgba(10,13,18,.56)` | `rgba(0,0,0,.68)` | Backdrop behind modal overlays. |

The semantic roles remain the same across themes; each theme selects colors independently. The proposed muted text has at least 4.7:1 contrast on its page canvas, and the proposed solid LIVE badge label has at least 6.4:1 contrast. Recheck combinations in implemented screens, especially text over media, disabled states, and translucency.

## 3. Typography

The typography scale and roles below are **LOCKED for v1**. The actual font family is **PROVISIONAL / NEEDS HUMAN DESIGN DECISION**. The system UI sans stack (`ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`) is a temporary rendering fallback, not the selected brand typeface. Evaluate any future family for high-quality Vietnamese and English rendering, including diacritics, line metrics, weight coverage, numerals, and performance. Use tabular numerals for counters, balances, timers, and metrics. Use a system monospace stack only for stream keys, code, and timecode. Do not make metadata monospace solely because it contains numbers.

| Style | Desktop size / line height | Weight | Use |
|---|---|---|---|
| Display | `48 / 56px` (`36 / 44px` small screens) | 700 | Rare, editorial hero or major campaign heading. |
| Page title | `32 / 40px` (`28 / 36px` small screens) | 700 | One route title. |
| Section title | `24 / 32px` | 650–700 | Major content sections. |
| Card title | `18 / 26px` | 600 | Stream/video title when space permits. |
| Body | `16 / 24px` | 400 | Reading, descriptions, primary form text. |
| UI | `14 / 20px` | 500–600 | Buttons, labels, tabs, compact navigation. |
| Metadata | `13 / 18px` | 500 | Creator, category, view count, time. |
| Caption | `12 / 16px` | 500 | Short secondary labels; never essential long text. |

Use sentence case for normal interface copy. Keep line lengths near 65–75 characters for prose. Avoid using all caps to manufacture hierarchy. Text truncation may shorten cards, but the full title must remain available through navigation context or an accessible name.

## 4. Spacing and shape

The principal spacing scale is `2, 4, 8, 12, 16, 24, 32, 48, 64px`, exposed as `--space-0-5`, `--space-1`, `--space-2`, `--space-3`, `--space-4`, `--space-6`, `--space-8`, `--space-12`, `--space-16`. Use 2–4px for icon/label adjustment, 8–16px inside controls, 16–24px between related content, 32–48px between sections, and 64px only for major editorial separation. Page gutters are 16px on narrow screens, 24px on medium screens, and 32px on wide screens.

Radius tokens: `--radius-sm: 6px` for small chips; `--radius-control: 10px` for controls; `--radius-surface: 14px` for cards or panels that need a boundary; `--radius-overlay: 20px` for dialogs/sheets; `--radius-pill: 999px` only for true pills or circular controls. Thumbnails may have a small radius; the video stage itself stays rectangular or uses only a restrained corner radius.

## 5. Borders, elevation, and motion

Use a 1px subtle divider for section separation, a 1px default border for controls, and a strong border for selected state where fill is insufficient. Focus uses a visible 2px `--color-focus` outline with 2px offset; it must not be replaced by a shadow alone. Do not use a border and shadow on every content item.

Elevation tokens: `--shadow-popover: 0 8px 24px rgba(0,0,0,.12)` and `--shadow-dialog: 0 20px 56px rgba(0,0,0,.20)`. Dark-theme elevation may rely more on surface contrast and a subtle border than a larger shadow. Cards have no default shadow. Reserve shadows for floating menus, popovers, dialogs, and controls over media.

Motion tokens: `--motion-fast: 120ms`, `--motion-standard: 180ms`, `--motion-overlay: 240ms`, and `--ease-standard: cubic-bezier(.2,.7,.2,1)`. Hover/focus transitions use fast motion; entering and leaving overlays use overlay motion. Avoid layout shifts and looping decorative animation. The LIVE dot may use a gentle pulse only when genuinely live; its static state communicates the same meaning. Under `prefers-reduced-motion: reduce`, remove the pulse, smooth scrolling, parallax, and nonessential transitions.

## 6. Icons, layout, and layers

Use Lucide as the primary interface icon set, with consistent stroke weight. Default icons are 20px; compact controls use 16px and prominent controls 24px. Icons clarify a known action or state; they do not precede every title, metric, and button. An icon-only control has an accessible name, a tooltip when the action needs explanation, and a practical 44×44px hit target on touch interfaces. Provider marks and the temporary product logo are exceptions to the icon style.

| Layout category | Provisional max content width | Behavior |
|---|---:|---|
| Form | 560px | Auth, payment step, and long forms maintain readable width. |
| Discovery | 1440px | Media-led grid; 16:9 thumbnails; columns respond to available width. |
| Creator/workspace | 1440px | Preview and controls can form two columns; dense data stays readable. |
| Viewing | 1600px or full available width | Video stage leads; chat/sidebar follows and moves below on narrow screens. |
| Admin | 1600px | Navigation and tables can use width; tables scroll only when necessary. |

These max-width values are **PROVISIONAL / NEEDS RESPONSIVE VALIDATION** on populated screens in both supported locales. They are starting points, not fixed limits for every route in a category. Breakpoint candidates of 640px (compact), 960px (two-column opportunity), and 1280px (wide) are **PROPOSED / NEEDS RESPONSIVE VALIDATION**, not immutable Design System law. Choose final breakpoints from where real content and controls need to change composition; use container queries where a component's width, rather than viewport width, determines its composition. Grids should prefer `minmax(0,1fr)` and explicit minimum card widths so media never force horizontal page overflow. Purposeful horizontal media carousels must indicate that more content is available.

At 320–390px viewport widths, navigation must preserve access to search, locale, account, and theme controls by regrouping or moving actions into a menu; it must never crop controls beyond the right edge.

Semantic layers: `--layer-base: 0`, `--layer-sticky: 10`, `--layer-menu: 20`, `--layer-tooltip: 30`, `--layer-overlay: 40`, `--layer-dialog: 50`, `--layer-toast: 60`. Local children may use small relative layers within their stacking context. No feature introduces a global `999` or `9999` layer.

## 7. Component architecture

Design System components own generic presentation and interaction contracts. They do not import product APIs, Redux state, stream models, payment logic, or routes. The minimum inventory is:

- **Primitives:** Button, IconButton, Input, Textarea, Select, FormField, Badge, Avatar, Divider. Add Checkbox, Radio, or Switch only when a real product choice needs one.
- **Feedback:** Alert, Toast, Spinner, Skeleton, EmptyState, ErrorState, Progress.
- **Overlays:** Dialog, Sheet where a mobile task genuinely benefits from it, Popover, Tooltip, Menu.
- **Navigation:** Tabs and Pagination. Breadcrumb is added only if a real route hierarchy needs it.
- **Data display:** Card, Table primitives, Stat, and Progress. A LIVE badge is the one product semantic promoted to a shared UI component because it appears across discovery, viewing, profile, and creator routes.
- **Layout:** PageContainer, Stack, Inline, Grid, Section. These wrap spacing/alignment; they do not force every route into one width.

Avoid speculative components and a large variant catalog. Compose a product pattern from primitives when the domain meaning differs.

## 8. Component contracts

All controls support the relevant `disabled`, `loading`, `invalid`, and `aria-*` states. `sm`, `md`, and `lg` sizes are allowed only where listed. `md` is the default. Visual state never replaces semantic HTML state. Button height is contextual: 36px is for compact or data-dense desktop contexts only, 44px is the standard/default size, and 48px is for prominent or touch-oriented actions. Touch interfaces must preserve a practical hit target of at least 44×44px, including when the visible control is smaller.

| Component | Purpose, variants, sizes, states | Accessibility and responsive behavior | Do / Don't |
|---|---|---|---|
| **Button** | Actions: `primary`, `secondary`, `ghost`, `danger`; `sm` 36px for compact or data-dense desktop contexts only, `md` 44px standard/default, `lg` 48px prominent or touch-oriented; default/hover/pressed/focus/disabled/loading. | Native `<button>` with explicit `type`; loading keeps width and prevents repeat action; label may wrap or control may fill its container; touch hit target is at least 44×44px. | Do use one primary action per local decision. Don't color routine actions LIVE red or use links as buttons. |
| **IconButton** | Compact icon action: `quiet`, `surface`, `danger`; 40px in compact desktop contexts or 44px for touch; same interaction states. | Required accessible name; practical touch hit target of at least 44×44px; tooltip only if needed; icon never the sole status explanation. | Do use for playback-adjacent or toolbar actions. Don't shrink below touch target to fit more icons. |
| **Input** | Single-line entry; `sm` 36px, `md` 44px; default/focus/invalid/disabled/read-only. | Native input, connected label, description and error IDs; mobile keyboard type reflects data. | Do use meaningful `type` and autocomplete. Don't rely on placeholder as label. |
| **Textarea** | Multi-line entry; `md`, optional compact; same field states. | Connected label/error; readable line height; user-resizable unless constrained by task. | Do show character limit when real. Don't make a one-line input look multi-line. |
| **Select** | Finite option choice; native select first; `md`; field states. | Label and selected value announced; no color-only option meaning; full width on compact forms. | Do use native control when sufficient. Don't create a custom menu only for styling. |
| **FormField** | Label, required/optional cue, description, control, error/success message; standard or compact spacing. | Generates/accepts stable IDs and `aria-describedby`; errors announced near the field. | Do centralize field anatomy. Don't repeat error in several unrelated regions. |
| **Badge** | Short categorical status: `neutral`, `success`, `warning`, `danger`, `info`; one size, compact. | Text accompanies color; wraps no essential sentence. | Do label a real state. Don't badge ordinary metadata. |
| **LiveBadge** | LIVE only: `solid` over media or `subtle` in text-heavy UI; compact and standard. | Text always says LIVE; dot is decorative; no motion required to identify state. | Do use only for an active stream. Don't reuse for scheduled or merely featured content. |
| **Avatar** | Person/channel identity; 24, 32, 40, 56px. | Image alt uses person's name when informative; decorative when adjacent name is already read; initials fallback. | Do maintain consistent crop. Don't use random saturated fallback colors. |
| **Card** | Optional grouping surface: `plain`, `outlined`; no size variants. | If clickable, one clear link/button target with accessible name; content order survives stacking. | Do use when grouping improves scanning. Don't wrap every stream/video in a bordered shadowed box. |
| **Dialog** | Focused modal task: standard or destructive; width `sm` 440px / `md` 560px / `lg` 720px, max viewport. | Labelled title, optional description, focus entry/trap/return, Escape, scroll lock, accessible busy behavior; becomes full-width inset panel on narrow screens. | Do reserve for interrupting decisions. Don't nest two active dialogs. |
| **Tabs** | Switch related panels; underline or quiet segmented style; one size. | `tablist`/`tab`/`tabpanel`, `aria-selected`, roving arrow keys, Home/End, visible focus; horizontal overflow keeps every tab reachable and the active tab visible, including with expanded translations. | Do keep panel content related. Don't use tabs as route links unless navigation semantics are implemented. |
| **Tooltip** | Short supplementary explanation; one appearance. | Trigger keeps its own accessible name; opens on hover and focus, closes on Escape; never holds required content. | Do clarify icon controls. Don't hide validation or critical status here. |
| **Menu** | List of actions, including user and moderation menus; neutral or destructive item. | Trigger exposes expanded state; arrow navigation, Escape, focus return; avoid hover-only access. | Do use for secondary actions. Don't bury the primary task. |
| **Alert** | Persistent inline feedback: `info`, `success`, `warning`, `danger`; compact or standard. | Correct live-region urgency; title/message/action order; text carries meaning. | Do explain what happened and next action. Don't use color alone or a generic error sentence. |
| **Toast** | Brief nonblocking confirmation: `success`, `info`, `danger`; one size. | Polite announcement unless urgent; dismissible, sufficient reading time; stack below dialogs, not over controls. | Do use for completed background actions. Don't make it the only place a form error appears. |
| **Skeleton** | Placeholder matching media/text geometry; thumbnail, line, avatar, row forms. | `aria-hidden`; parent region announces loading once; pulse disabled for reduced motion. | Do preserve layout. Don't show skeleton after an actual error or empty result. |
| **EmptyState** | Valid zero-result state: title, one sentence, optional action; standard/compact. | Heading follows page hierarchy; action is a real button/link. | Do distinguish no content from failure. Don't invent decorative illustrations for every empty list. |
| **Table primitives** | `Table`, header, row, cell, caption, optional sort control; compact/standard density. | Native table semantics, scope on headers, announced sort direction; horizontal overflow only when columns cannot adapt. | Do use for comparisons/admin lists. Don't turn a simple two-value layout into a table. |
| **PageContainer** | Context categories `form`, `discovery`, `creator/workspace`, `viewing`, `admin`; exact max widths are provisional; no color variant. | Fluid gutters and safe-area spacing; never changes heading semantics. | Do choose width by task. Don't impose the form width on media or admin pages. |

`Spinner` is reserved for short indeterminate waits inside controls or compact regions; page loading uses geometry-preserving Skeleton where possible. `ErrorState` builds on Alert/EmptyState anatomy and offers retry only when retry is meaningful. `Progress` uses a labelled determinate value for upload or processing when one exists.

## 9. Product-specific patterns

| Pattern | Ownership | Rule |
|---|---|---|
| StreamCard and VideoCard | Product component | Shared media ratio and metadata rhythm; data fetching remains outside presentation. |
| CreatorIdentity | Product component | Avatar/name/follow context assembled from primitives. |
| GoLiveAction | Product component | The one prominent action allowed to use the LIVE red surface; wraps the Button behavior contract without adding a general red variant. |
| LiveBadge | Design System component | Single visual and semantic LIVE contract across product. |
| ViewerCount | Product component | Counter plus viewer icon/label where needed; no colored tile by default. |
| CoinBalance | Product component | Economy semantic color and tabular number; not a generic Badge. |
| Donation presentation | Product or feature component | Viewer alert and checkout have different behavior but share economy semantics. |
| AnalyticsMetric / CreatorStat | Product component | Label, value, unit, trend; chart context determines color. |
| ChatMessage | Feature-local component | Chat timing, moderation and identity are domain behavior. |
| StreamHealthIndicator | Feature-local component | Operational states and thresholds belong to creator streaming. |

## 10. Interaction states

Hover makes a control's affordance clearer without changing its meaning. Keyboard focus uses the focus outline on every interactive element. Pressed state is brief and distinct from selected state. Selected state persists through navigation or filtering and uses shape, weight, or marker as well as color. Disabled state prevents action, remains readable, and explains why when that matters. Loading state retains control dimensions and prevents duplicate submission.

Error, success, warning, and info always pair color with text or icon plus text. Empty means a successful request with no content; error means failure; loading means unresolved; offline means a stream ended or is unavailable; scheduled means a future time and must never use LIVE styling; processing means a known work-in-progress state. LIVE requires verified active stream state and uses the unique LIVE red and label.

## 11. Forms

Every input has a persistent visible label unless a compact toolbar has an equivalent accessible label. Mark required fields consistently; mark optional fields when most fields are required. Description appears between label and control or directly beneath the control. Validation appears next to the affected field after blur or submit, with a summary only when multiple errors need navigation. Preserve values after a failed submission. Submit buttons show progress and block duplicates. Destructive actions use the danger treatment and a confirmation when the consequence is hard to reverse. Payment-provider elements retain provider requirements while their surrounding labels, spacing and feedback follow this system.

Form rhythm: 6–8px label-to-control, 6–8px control-to-help/error, 16–24px between fields, and 24–32px before final actions. Long forms group related fields with a heading and whitespace before using another card.

## 12. Dialog and overlay behavior

On open, move focus to the title or first safe control; trap Tab/Shift+Tab within the active dialog; make background content inert; lock background scroll while preserving scrollbar position. On close, restore focus to the invoking control when it still exists. Escape closes unless a noninterruptible operation is in progress; the close button remains visible. Backdrop click may close low-risk dialogs but never destructive confirmations or payment submission. A busy dialog blocks only actions that would corrupt the operation and explains progress.

Every dialog has an accessible title; add a description when the task is not self-explanatory. Use one active modal layer. A dependent step replaces the active dialog content or closes it before opening another. A narrow viewport uses an inset full-width dialog; use a bottom sheet only for short, touch-oriented choices. Menus and tooltips are nonmodal and follow separate focus behavior.

## 13. Light and dark themes

Both themes preserve the same hierarchy. Light uses a near-white page and white content surfaces; dark uses a deep neutral page with lighter content surfaces and borders strong enough to separate them. Media remains the darkest stage in either theme. Apply a dark scrim or text backing to metadata over variable thumbnails; do not assume all images support white text. Dark theme uses brighter status text and quieter fills, not inverted light-theme hex values. Disabled text still needs legibility. Check every semantic text/background pair, overlays, and focus against actual rendered pages.

## 14. Accessibility rules

Target WCAG AA text contrast: at least 4.5:1 for normal text and 3:1 for large text; nontext boundaries and focus indicators need at least 3:1 against adjacent colors. Native semantics are preferred. Keyboard users must reach every action, navigate tabs/menus/dialogs, and perceive focus. Touch interfaces preserve practical interactive targets of at least 44×44px. Media controls, playback errors, LIVE state, and realtime messages need text equivalents. Use polite live regions for routine updates and assertive regions only for urgent errors. Respect reduced motion and zoom up to 200% without losing content or action access.

## 15. Localization & Content Resilience

OmexLive initially supports Vietnamese (`vi`) and English (`en`). The following are normative requirements for every Design System component and composition:

1. Tolerate translated text expansion without overlap, clipping, or loss of function. Do not set fixed widths based on English labels.
2. Permit text to wrap where the layout and task allow it. Truncate only when information loss is acceptable, and keep the full meaning available when a user needs it to act or decide.
3. Preserve critical actions in compact layouts. Reflow, stack, or move secondary actions into a reachable menu before critical actions become inaccessible.
4. Define reachable overflow behavior for tabs and navigation, including a visible current item and a way to reach items outside the viewport.
5. Do not assume English capitalization, word length, or word boundaries in component layout or styling. Render Vietnamese diacritics without clipping or degraded line spacing.
6. Remain stable when the locale changes at runtime: control state, focus, selection, and access to actions must survive the resulting copy and layout changes.

Translation architecture, locale routing, date and number formatting, and locale persistence belong to **Frontend Standards**, rather than this Design System specification.

## 16. Content-first rules

These content-first and anti-plastic rules are normative Design System constraints.

1. Give thumbnails and creator identity visual priority on discovery screens.
2. Use whitespace and typography before adding a card, border, or colored fill.
3. A regular card does not receive a shadow by default.
4. Use gradients only to make text over media readable or for a deliberate branded campaign surface; never as generic panel decoration.
5. Do not add glow to buttons, badges, metrics, or cards. A restrained LIVE signal is the exception.
6. Do not use multiple strong accent colors in one local control group.
7. Reserve pills and badges for compact, meaningful states or filters. Ordinary metadata stays text.
8. Do not convert every metric into a colored tile. Group related metrics by alignment and labels.
9. Keep copy direct and human; do not use all-caps eyebrow labels on every section.

## 17. Future Next.js boundary

The intended boundary is `shared/tokens/` for token definitions, `shared/styles/` for reset/theme/foundation CSS, and `shared/ui/` for portable primitives and compositions. Product patterns belong with product/domain modules; feature-local chat, stream health, payments, and admin behavior stay with those features. This is a future boundary, not a request to move current files.

Static presentation components should render in Server Components where possible. Interactive controls, dialogs, menus, tabs, and toasts become small Client Component leaves. No Design System module imports routing, Redux, RTK Query, Socket.IO, Stripe, or backend types. Theme selection is applied at the app shell; components consume semantic tokens and do not inspect route context to choose colors.

## 18. Governance

- Before adding a color, choose an existing semantic role. A new role requires a documented product meaning, light/dark values, and contrast review.
- Use the spacing, radius, motion, and layer scales. A local exception names the layout reason; it does not silently introduce a near-duplicate token.
- Before adding a component, check an existing primitive, product pattern, and composition. Add a variant only for a recurring semantic difference, not to avoid composing two elements.
- Generic presentation and accessibility behavior belong in Design System components. API calls and business decisions stay in product or feature code.
- Review every component in default, hover, focus, disabled, loading, error, compact viewport, light theme, dark theme, and reduced motion states when applicable.
- Document examples showing correct and incorrect usage. Remove obsolete variants as migration proceeds rather than retaining permanent aliases.

## 19. Representative screen composition

- **Home:** lead with a live/media feature and scannable thumbnail rows. Section headings and spacing organize content; avoid a large bordered panel around each list.
- **Watch Live:** video stage dominates. Chat is a functional side region, not a competing visual hero. LIVE, viewer count and donation moments remain readable without constant glow or motion.
- **Creator workspace:** preview, stream status and controls have clear priority; analytics form a compact aligned group. Operational density is acceptable without decorative metric tiles.
- **Admin:** navigation and table structure do the work. Use semantic status, clear row actions, and restrained surfaces.
- **Login:** one focused task, persistent labels, clear OTP step, calm dialog surface and visible recovery path.

## 20. Acceptance criteria for v1 implementation

1. No feature uses raw color values for ordinary UI where a semantic token exists.
2. Repeated controls, LIVE labels, dialogs, tabs, and feedback use one documented contract.
3. Light and dark themes provide equivalent hierarchy and pass contrast checks on representative populated screens.
4. Keyboard and reduced-motion checks cover dialogs, menus, tabs, forms, media controls, and creator/admin actions.
5. Discovery shows content before chrome; creator and admin views remain denser without becoming a separate visual system.
6. Component APIs remain portable across the present Vite app and a future Next.js app.
7. Populated Vietnamese and English screens tolerate text expansion, preserve critical actions, and keep tabs/navigation reachable at compact widths and during runtime locale switching.
8. Breakpoint and max-width candidates are visually validated with populated discovery, viewing, creator/workspace, form, and admin screens before adoption as final values.

## 21. Open design decisions

- **Logo:** current artwork remains temporary; revisit the brand mark after the UI direction is validated. Its present blue/red colors do not define these tokens.
- **Font family:** provisional and awaiting a human design decision. The temporary system UI fallback is not a final brand typeface. Evaluate candidates with Vietnamese and English copy, diacritics, numeric telemetry, performance, and both themes before selection.
- **Media examples:** validate the system using real, varied thumbnails and avatars before brand approval; empty/error states alone cannot establish the final visual balance.
- **Mobile overlays:** validate whether each long creator task works better as an inset dialog or a dedicated page; do not default all dialogs to sheets.

## 22. Decision Status

| Status | Decisions |
|---|---|
| **LOCKED v1 decisions** | Quiet Broadcast direction; neutral routine actions, red for LIVE and explicit Go Live, gold for economy, teal for analytics, and separate feedback colors; content-first and anti-plastic rules; typography scale and roles; Dialog accessibility and interaction contract; localization and content resilience requirements for `vi` and `en`. |
| **PROVISIONAL decisions** | Actual font family and temporary system UI fallback; current logo artwork; 640/960/1280px breakpoint candidates; 560/1440/1600px contextual max-width candidates. These values do not become immutable rules by appearing in this draft. |
| **NEEDS RUNTIME VALIDATION** | Responsive breakpoint and container candidates on populated screens; Vietnamese/English text expansion and runtime locale switching; compact navigation and critical action access; contrast over real media; dialog behavior in representative tasks. |
| **NEEDS HUMAN DESIGN DECISION** | Final font family after high-quality Vietnamese and English evaluation. Revisit logo and broader brand identity after the new direction is established, outside this phase. |
