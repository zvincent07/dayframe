FULL-STACK ENGINEERING RULES Next.js App Router · TypeScript · MongoDB ·
Shadcn UI

================================================= CORE ENGINEERING
PRINCIPLES (ABSOLUTE) =================================================

KISS Prefer boring, readable solutions. Avoid clever abstractions. If it
needs explanation, simplify it.

DRY One source of truth. Shared logic lives in one place. No duplicated
validation or permission checks.

CLEAN CODE Readability > cleverness. Explicit naming. Small, focused
files. One component = one responsibility.

STABILITY FIRST Never break the build. Never bypass types. Never use
any. Never ship warnings. Correctness > speed.

YAGNI Build only what is needed now. No speculative abstractions.

================================================= ARCHITECTURE OVERVIEW
=================================================

Frontend + Backend in Next.js App Router.

Layers:

app/ components/ lib/ services/ repositories/ permissions/ schemas/
hooks/ types/

Clear separation of concerns:

UI = components Business logic = services DB access = repositories
Permissions = permissions/ Validation = schemas/ Connection = lib/ Types
= types/

================================================= TYPESCRIPT RULES
(STRICT MODE) =================================================

TypeScript is mandatory. Never use any. Prefer interface over type. No
enums — use typed maps. Use absolute typing everywhere. No implicit
returns for complex functions. Fail compilation on type errors.

Naming: Boolean variables: isLoading, hasError, canEdit Functions:
verb-first (createJournalEntry) Directories: lowercase-with-dashes

================================================= NEXT.JS APP ROUTER
RULES =================================================

RENDERING PRIORITY React Server Components (default) Server Actions
Route Handlers Client Components (only if necessary)

LIMIT use client Allowed only for: Browser APIs Controlled inputs Small
interactive components

Forbidden: Data fetching Business logic Permission enforcement

DATA FETCHING Fetch in: Server Components Server Actions Route Handlers
Never fetch in client components. Never expose raw DB queries to client.

================================================= SHADCN UI PRIORITY
RULES (MANDATORY) =================================================

Shadcn UI is the primary UI system.

Rules: No custom buttons if Shadcn provides one. No inline Tailwind-only
components if Shadcn equivalent exists. Extend Shadcn components instead
of rewriting.

Shared UI MUST live in: components/ui/

Required Shared Components: Button Input Form Table Modal / Dialog
Dropdown Select

If used more than once → extract into reusable component.

================================================= TAILWIND RULES
=================================================

Mobile-first design. No inline styles. No hardcoded colors outside
design system. Use utility classes only. Use consistent spacing scale.
Avoid deeply nested layout wrappers.

================================================= RESPONSIVE DESIGN
(MANDATORY) =================================================

The application MUST be fully responsive across all device sizes.

Device Support Requirements: Mobile (small screens, touch-first) Tablet
Desktop Large screens

Rules: Mobile-first design is required. Design for smallest viewport
first, then scale up. No fixed-width layouts. No horizontal scroll. Use
Tailwind responsive utilities (sm:, md:, lg:, xl:). Avoid hardcoded
pixel widths unless necessary. Use flexible layouts (flex, grid). Tables
must handle overflow properly. Modals must adapt to small screens. Forms
must be usable on mobile (touch-friendly inputs). Buttons must have
accessible tap targets. Images must be responsive and optimized. No
layout breaking at common breakpoints.

Performance & UX: Avoid layout shift (CLS). Maintain consistent spacing
across breakpoints. Navigation must adapt (mobile menu vs desktop
sidebar). Test on real device dimensions, not only resized desktop.

Enforcement: Every new component must be responsive by default. No
component is complete unless tested on mobile and desktop.
Responsiveness is not optional.

================================================= STATE MANAGEMENT
STRATEGY =================================================

URL IS THE TRUTH Prefer URL state (searchParams) over `useState` for:
Filters Pagination Tabs Search queries

This ensures deep-linking and shareable URLs.
Use `useState` only for transient UI state (modals, dropdowns, form inputs).
Use `useOptimistic` for instant mutation feedback.
Avoid global state (Redux/Zustand) unless absolutely necessary.

================================================= COMPONENT RULES
=================================================

One Component = One Responsibility

File structure: export function Component() Subcomponents Helpers Static
content Types

Forbidden: Logic-heavy JSX Inline permission checks Inline data fetching
Duplicated forms Copy-pasted tables

================================================= OPTIMISTIC UI
(MANDATORY FOR MUTATIONS)
=================================================

For all mutations:
1. Use React's `useOptimistic` hook for instant feedback.
2. Wrap server action calls in `startTransition`.
3. Server Actions MUST `revalidatePath` on success.
4. Handle errors with Toast notifications.
5. Do NOT use manual state snapshots if `useOptimistic` is applicable.

================================================= AUTHORIZATION MODEL
(CRITICAL) =================================================

Permissions Over Roles Roles are implementation details. Never:
user.role === ‘admin’

CENTRAL PERMISSION MAP (MANDATORY)

const ROLES = {
  admin: [
    // Content / Journal
    "create:journal",
    "delete:journal",
    "view:all-journals",
    
    // User Management
    "view:users",
    "create:user",
    "update:user-role",
    "update:user-status", // ban/unban, verify
    "delete:user",
    
    // System Settings
    "view:settings",
    "update:settings",
    "view:audit-logs",
    "manage:maintenance-mode",
  ],
  mentor: [
    "view:assigned-journal",
    "comment:journal",
  ],
  user: [
    "create:journal",
    "update:own-journal",
    "view:own-journal",
  ],
} as const;

Permission strings must be typed. No hardcoded permission checks. Deny
by default.

AUTHORIZATION UTILITIES (REQUIRED) hasPermission() requirePermission()
requireOwnership() isOwnerOrAdmin()

Client checks = UX only Server checks = mandatory

================================================= SERVER-SIDE
ENFORCEMENT (NON-NEGOTIABLE)
=================================================

All reads must validate ownership. All mutations must validate
permissions. Assume client is malicious. Never trust session blindly.

================================================= MONGODB RULES (STRICT)
=================================================

CONNECTION Use lib/mongodb.ts Use global caching Use async/await only

SCHEMAS Schemas are mandatory. No schema-less writes. Reject unknown
fields. Align schema with TypeScript interface. Keep documents small.
Avoid deep nesting. Prefer references when needed.

QUERY SAFETY Never accept raw query objects. Whitelist filter fields.
Paginate all list endpoints. Limit all result sets. Prevent NoSQL
injection. Index frequently queried fields.

================================================= DATABASE ACCESS LAYER
=================================================

No DB access in UI. No DB access in components. DB access only in:
repositories/ server actions route handlers (calling repositories)

Repositories: Return plain objects. No business logic. No permission
logic.

================================================= SERVICES LAYER (CORE
BUSINESS LOGIC) =================================================

Services MUST: Enforce permissions Enforce ownership Validate business
rules Coordinate repositories Enforce invariants

Services MUST NOT: Contain raw DB queries Contain UI logic

================================================= INPUT VALIDATION
(MANDATORY) =================================================

Use Zod. Validate body, params, and query. Reject unknown fields.
Validate before hitting service layer. Never trust frontend validation.

================================================= AUTHENTICATION
=================================================

Validate session/token once per request. Use Secure + HttpOnly cookies.
SameSite cookies enabled. No tokens in URLs. Identity verified before
authorization.

================================================= CSRF & SECURITY
=================================================

CSRF protection required for mutations. SameSite=strict when possible.
No secrets in logs. No stack traces to client. Sanitize user input.
Escape dangerous output. Protect file uploads. Limit payload sizes.

================================================= RATE LIMITING
=================================================

Rate limit auth endpoints. Rate limit write endpoints. Protect against
brute force.

================================================= ERROR HANDLING
=================================================

Fail fast. Return typed error responses. Centralized error format. Log
server-side only. No sensitive data in error responses.

================================================= LOGGING
=================================================

Log errors with context. Never log secrets. Never log tokens. Never log
passwords.

================================================= ENVIRONMENT & SECRETS
=================================================

Env variables only. Validate env on startup. Fail startup if invalid.
Never commit secrets. Use `t3-env` or similar validation pattern.
Update `.env.example` when adding keys.

================================================= GIT & COMMIT
CONVENTIONS =================================================

Commits must follow Conventional Commits format:
feat: new feature
fix: bug fix
docs: documentation changes
refactor: code change that neither fixes a bug nor adds a feature
test: adding missing tests or correcting existing tests

Squash PRs before merging. Keep history clean.

================================================= API VERSIONING
=================================================

Use /api/v1/ No breaking changes without version bump.

================================================= PERFORMANCE RULES
=================================================

Prefer RSC over client components. Minimize useEffect. Avoid unnecessary
re-renders. Use Suspense boundaries. Optimize images (WebP + lazy
loading). Index DB properly. Avoid N+1 queries. Cache safe reads when
needed. Measure before optimizing.

================================================= TESTING RULES
=================================================

Unit/Logic Tests: Use **Vitest**. Test Services, Utils, and Libs.
E2E Tests: Use **Playwright**. Test critical user flows.
Do not test UI implementation details. Test behavior.
Mock repositories. Test permission enforcement. Security tests are mandatory.

================================================= GLOBAL ANTI-PATTERNS
=================================================

Business logic in UI Permission logic in UI DB access in components
Role-based conditionals Untyped permissions Fetching in client
components Over-abstraction Duplicated UI Custom UI when Shadcn exists

================================================= AI ENFORCEMENT MODE
=================================================

When generating code: Prefer Server Components Enforce permission
utilities Enforce repository/service separation Reject direct DB access
in UI Use Shadcn first Never use any Never hardcode roles Never skip
validation

END OF RULE FILE
