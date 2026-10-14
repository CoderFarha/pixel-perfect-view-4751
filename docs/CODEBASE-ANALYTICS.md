# TradeHub Codebase Analytics

> Scope: read-only audit of the current checkout. Verified with repository inspection, route generation, test output, and production build output. This document distinguishes verified facts from inferred status where the workspace does not include production configuration or migrations.

## Section 1 — System overview

### Summary table

| Metric | Value | Evidence |
|---|---:|---|
| Repository | `pixel-perfect-view-4751` | Workspace root |
| Framework | TanStack Start + React 19 + Vite + TypeScript strict mode | [package.json](../package.json), [src/routes/index.tsx](../src/routes/index.tsx), [src/router.tsx](../src/router.tsx) |
| Deployment target | Cloudflare Workers (static asset + server bundle) | [wrangler.jsonc](../wrangler.jsonc) |
| Production URL | Not verified in repo; prompt references `pixel-perfect-view-4751.zakmi-moha.workers.dev` as a deployment target | Inferred from prompt context; not validated from code |
| Database | No checked-in Supabase/Postgres migration directory; Prisma schema exists for intelligence models only | [prisma/schema.prisma](../prisma/schema.prisma) |
| Auth | Supabase magic link auth on browser; server bearer verification helper exists but is not wired to a real app API surface | [src/lib/auth.ts](../src/lib/auth.ts), [src/routes/login.tsx](../src/routes/login.tsx), [src/lib/auth/require-session.ts](../src/lib/auth/require-session.ts) |
| Multi-tenancy model | Tenant-scoped metadata check exists in server auth helper and Prisma models use `tenantId`, but no tenant-scoped app tables or enforcement code were found in this checkout | [src/lib/auth/require-session.ts](../src/lib/auth/require-session.ts), [prisma/schema.prisma](../prisma/schema.prisma) |
| Total routes | 30 route files under `src/routes/` | `find src/routes -type f | wc -l` |
| Total components | 54 component files under `src/components/` | `find src/components -type f | wc -l` |
| Total domain files | 9 domain files under `src/domain/` | `find src/domain -type f | wc -l` |
| Total services | 7 service files under `src/services/` | `find src/services -type f | wc -l` |
| Total migrations | 0 Supabase migrations found | `find supabase/migrations -type f | wc -l` returned `0` |
| Total LOC | 18,370 in `src/**/*.ts` and `src/**/*.tsx` | `find src ... | xargs -0 wc -l | tail -1` |
| Test coverage | 29 passing tests, 0 failing tests | `npm test` output |

### Verified counts

```bash
cd /workspaces/pixel-perfect-view-4751
find src -type f \( -name "*.ts" -o -name "*.tsx" \) | wc -l
find src/routes -type f | wc -l
find src/components -type f | wc -l
find src/lib -type f | wc -l
find src/services -type f | wc -l
find src/domain -type f | wc -l
find supabase/migrations -type f | wc -l
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -print0 | xargs -0 wc -l | tail -1
```

Observed output:

```text
src ts/tsx files: 132
src/routes files: 30
src/components files: 54
src/lib files: 28
src/services files: 7
src/domain files: 9
supabase/migrations files: 0
total LOC: 18370
```

### Executive readout

- This is primarily a front-end demo/ops workspace, not a fully operational SaaS backend.
- Business screens are composed from static demo data and browser `localStorage` patterns.
- Supabase auth is configured and used for browser sign-in flow.
- The strongest “backend-like” code is a server-side session guard and intelligence services, but those are not tied to a real database or API footprint in the workspace.
- The `prisma` models indicate a planned or partial backend schema for intelligence features, but they do not match the full business domain of orders, sourcing, clients, suppliers, or invoices.

---

## Section 2 — Complete route map

### Route inventory

| Path | File | Component name | Auth required | Purpose | Data source |
|---|---|---|---|---|---|
| `/` | [src/routes/index.tsx](../src/routes/index.tsx) | `Landing` | No | Public product landing page | Static marketing copy and design tokens |
| `/login` | [src/routes/login.tsx](../src/routes/login.tsx) | `LoginPage` | No | Email magic-link sign-in | Supabase Auth |
| `/auth/callback` | [src/routes/auth.callback.tsx](../src/routes/auth.callback.tsx) | `AuthCallbackPage` | No | Exchange OAuth code and redirect to app | Supabase Auth |
| `/portal/$token` | [src/routes/portal.$token.tsx](../src/routes/portal.$token.tsx) | `ClientPortalPage` | No | Client-facing shipment/payment portal | Demo orders/payments and localStorage |
| `/app` | [src/routes/app.tsx](../src/routes/app.tsx) | `AdminLayout` | Yes (session check) | Shell + sidebar + session gate | Supabase session + localStorage config |
| `/app/` | [src/routes/app.index.tsx](../src/routes/app.index.tsx) | `Dashboard` | Yes | KPI dashboard and quick actions | Demo data + localStorage |
| `/app/agents` | [src/routes/app.agents.tsx](../src/routes/app.agents.tsx) | `AgentsPage` | Yes | Agent directory/CRUD stub | `tradehub:agents:v1` localStorage |
| `/app/brand` | [src/routes/app.brand.tsx](../src/routes/app.brand.tsx) | `BrandPage` | Yes | Brand validation checker | Demo brand/test data |
| `/app/clients` | [src/routes/app.clients.tsx](../src/routes/app.clients.tsx) | `ClientsPage` | Yes | Client directory management | `tradehub:clients:v1` localStorage |
| `/app/fx` | [src/routes/app.fx.tsx](../src/routes/app.fx.tsx) | `FxPage` | Yes | FX view/edit | `tradehub:fx-rates:v1` localStorage |
| `/app/inbox` | [src/routes/app.inbox.tsx](../src/routes/app.inbox.tsx) | `InboxPage` | Yes | Message thread/inbox list | `tradehub:conversations:v1` localStorage |
| `/app/invoices` | [src/routes/app.invoices.tsx](../src/routes/app.invoices.tsx) | `InvoicesPage` | Yes | Invoice list and document generation | `tradehub:invoices:v1` localStorage |
| `/app/logistics` | [src/routes/app.logistics.tsx](../src/routes/app.logistics.tsx) | `LogisticsPage` | Yes | Logistics partner management | `tradehub:logistics:v1` localStorage |
| `/app/market` | [src/routes/app.market.tsx](../src/routes/app.market.tsx) | `MarketPage` | Yes | category/market analysis screen | Demo market data |
| `/app/orders` | [src/routes/app.orders.index.tsx](../src/routes/app.orders.index.tsx) | `OrdersList` | Yes | Order list and CRUD | `tradehub:orders:v1` localStorage |
| `/app/orders/$id` | [src/routes/app.orders.$id.tsx](../src/routes/app.orders.$id.tsx) | `OrderDetail` | Yes | Order detail and stage advancement | `tradehub:orders:v1` localStorage |
| `/app/payments` | [src/routes/app.payments.tsx](../src/routes/app.payments.tsx) | `PaymentLayout` | Yes | Payment dashboard layout | Demo and localStorage |
| `/app/payments/` | [src/routes/app.payments.index.tsx](../src/routes/app.payments.index.tsx) | `PaymentsPage` | Yes | Payments overview | `tradehub:payments:v1` localStorage |
| `/app/payments/$id` | [src/routes/app.payments.$id.tsx](../src/routes/app.payments.$id.tsx) | `PaymentDetail` | Yes | Single payment edit/delete | `tradehub:payments:v1` localStorage |
| `/app/payments/commissions` | [src/routes/app.payments.commissions.tsx](../src/routes/app.payments.commissions.tsx) | `CommissionsPage` | Yes | Commission tracking | Demo totals |
| `/app/payments/ledger` | [src/routes/app.payments.ledger.tsx](../src/routes/app.payments.ledger.tsx) | `LedgerPage` | Yes | Supplier ledger and balances | `tradehub:payments:v1` localStorage |
| `/app/payments/new` | [src/routes/app.payments.new.tsx](../src/routes/app.payments.new.tsx) | `NewPaymentPage` | Yes | Manual payment creation | `tradehub:payments:v1` localStorage |
| `/app/payments/recurring` | [src/routes/app.payments.recurring.tsx](../src/routes/app.payments.recurring.tsx) | `RecurringPage` | Yes | Recurring payment schedule management | `tradehub:recurring-payments:v1` localStorage |
| `/app/reports` | [src/routes/app.reports.tsx](../src/routes/app.reports.tsx) | `ReportsPage` | Yes | Reports and KPI screens | Demo data |
| `/app/settings` | [src/routes/app.settings.tsx](../src/routes/app.settings.tsx) | `SettingsPage` | Yes | User settings | `tradehub:preferences:v1` localStorage |
| `/app/sourcing` | [src/routes/app.sourcing.index.tsx](../src/routes/app.sourcing.index.tsx) | `SourcingPage` | Yes | Sourcing request list and CRUD | `tradehub:sourcing-requests:v1` localStorage |
| `/app/sourcing/$id` | [src/routes/app.sourcing.$id.tsx](../src/routes/app.sourcing.$id.tsx) | `SourcingDetail` | Yes | Selected quote, stage, and lifecycle controls | `tradehub:sourcing-requests:v1` localStorage |
| `/app/suppliers` | [src/routes/app.suppliers.tsx](../src/routes/app.suppliers.tsx) | `SuppliersPage` | Yes | Supplier management | `tradehub:suppliers:v1` localStorage |

### Route metadata and consistency check

- `src/routes` contains 30 route files.
- [src/routeTree.gen.ts](../src/routeTree.gen.ts) defines the generated route tree for these files.
- No route file was found that is missing from the generated tree.
- No orphaned generated route appears in the tree without a corresponding source file in the route directory in the current checkout.
- No `src/routes/api` directory exists, so there are no route-level API endpoints in this checkout under the standard TanStack route pattern.

### Auth classification

| Category | Route examples | Status |
|---|---|---|
| Public | `/`, `/login`, `/auth/callback`, `/portal/$token` | No app-level auth gate beyond the auth callback itself |
| App routes | `/app*` | Protected by session check in [src/routes/app.tsx](../src/routes/app.tsx) |
| API routes | none under `src/routes/api` | Not implemented in the current checkout |
| Special routes | `/auth/callback`, `/portal/$token` | Present and functional as UI entry points |

---

## Section 3 — Component inventory

### 3A. UI primitives (shadcn-style)

The UI primitives are primarily generated shadcn/Radix wrappers under [src/components/ui](../src/components/ui). Verified file inventory includes:

- accordion
- alert
- alert-dialog
- aspect-ratio
- avatar
- badge
- breadcrumb
- button
- calendar
- card
- carousel
- chart
- checkbox
- collapsible
- command
- context-menu
- dialog
- drawer
- dropdown-menu
- form
- hover-card
- input
- input-otp
- label
- menubar
- navigation-menu
- pagination
- popover
- progress
- radio-group
- resizable
- scroll-area
- select
- separator
- sheet
- skeleton
- slider
- sonar-ish patterns present in asset variants
- switch
- table
- tabs
- textarea
- toggle
- toggle-group
- tooltip

These are support wrappers around Radix and utility classes to keep the app consistent with the design system pattern.

### 3B. App components

| Component | File | Props | Used by | Purpose |
|---|---|---|---|---|
| `Card` | [src/components/kit.tsx](../src/components/kit.tsx) | `children`, `className`, `lift`, `variant` | App pages | Reusable glass-card container |
| `CardHeader` | [src/components/kit.tsx](../src/components/kit.tsx) | `title`, `subtitle`, `action` | App pages | Section header pattern |
| `EmptyState` | [src/components/kit.tsx](../src/components/kit.tsx) | `icon`, `title`, `description`, `action` | App pages | Empty/loading states |
| `Skeleton` / `TableSkeleton` | [src/components/kit.tsx](../src/components/kit.tsx) | `className`, `rows` | App pages | Loading placeholders |
| `StatusPill` | [src/components/kit.tsx](../src/components/kit.tsx) | `status` | App pages | Status chip |
| `DataCard` | [src/components/kit.tsx](../src/components/kit.tsx) | `title`, `subtitle`, `status`, `fields`, `onClick` | App pages | Card-of-key-values UI |
| `Badge` | [src/components/kit.tsx](../src/components/kit.tsx) | `children`, `tone`, `className` | App pages | Dense tag UI |
| `Stat` | [src/components/kit.tsx](../src/components/kit.tsx) | `label`, `value`, `sub`, `delta`, `tone`, `icon` | Dashboard widgets | KPI metric cards |
| `BrandLogo` | [src/components/brand.tsx](../src/components/brand.tsx) | optional size/layout props | Landing, sidebar, portal | Brand mark |
| `CrudPage` | [src/components/CrudPage.tsx](../src/components/CrudPage.tsx) | `title`, `subtitle`, `records`, `fields`, `columns`, CRUD callbacks | Orders, sourcing, clients, suppliers, logistics | Generic list/detail editor |
| `ShipmentTracker` | [src/components/ShipmentTracker.tsx](../src/components/ShipmentTracker.tsx) | `orderId` / order-related props | Shipping-related UI | Tracking and photo updates |
| `TaglineChecker` | [src/components/TaglineChecker.tsx](../src/components/TaglineChecker.tsx) | local form state | Brand-check screens | Server-side tagline validation |
| `PaymentForm` | [src/components/payments/PaymentForm.tsx](../src/components/payments/PaymentForm.tsx) | payment form schema, callbacks | Payments flows | Multi-line payment capture |
| `PaymentStatusPill` | [src/components/payments/shared.tsx](../src/components/payments/shared.tsx) | `status` | Payments & portal | Payment status chip |

### 3C. Layout components

| Component | File | Purpose |
|---|---|---|
| `AdminLayout` | [src/routes/app.tsx](../src/routes/app.tsx) | App shell with sidebar, notifications, mobile nav |
| `Landing` | [src/routes/index.tsx](../src/routes/index.tsx) | Public marketing and hero layout |
| `ClientPortalPage` | [src/routes/portal.$token.tsx](../src/routes/portal.$token.tsx) | Client-facing portal shell |
| `PaymentLayout` | [src/routes/app.payments.tsx](../src/routes/app.payments.tsx) | Payment sub-area tab/nav layout |

### 3D. Form components

| Component | File | Fields | Validation | Submits to |
|---|---|---|---|---|
| `LoginPage` | [src/routes/login.tsx](../src/routes/login.tsx) | email | `type=email` + non-empty trim | `signInWithMagicLink()` via Supabase |
| `CrudPage` | [src/components/CrudPage.tsx](../src/components/CrudPage.tsx) | dynamic fields from route config | `required` attributes + number parsing in browser | `localStorage` collection via callback |
| `PaymentForm` | [src/components/payments/PaymentForm.tsx](../src/components/payments/PaymentForm.tsx) | `date`, `counterparty`, `amount`, `method`, `currency`, `reference`, `proof images` etc. | client-side checks; no schema enforcement | `tradehub:payments:v1` localStorage |
| `Client` form | [src/routes/app.clients.tsx](../src/routes/app.clients.tsx) | name, city, category, contact | Zod + React Hook Form | localStorage |
| `Settings` forms | [src/routes/app.settings.tsx](../src/routes/app.settings.tsx) | timezone, name, timezone preferences | browser inputs only | `tradehub:preferences:v1` |

### 3E. Feature components by area

| Area | Components |
|---|---|
| Intake | `TaglineChecker`, `BrandLogo`, sourcing request pages |
| Orders | `OrdersList`, `OrderDetail`, `ShipmentTracker` |
| Sourcing | `SourcingPage`, `SourcingDetail`, `TaglineChecker`, quote-related UI |
| Payments | `PaymentForm`, `PaymentStatusPill`, `PaymentsPage`, `PaymentDetail`, recurring templates |
| Clients | `ClientsPage`, client portal |
| Suppliers | `SuppliersPage` |
| Agents | `AgentsPage` |
| Logistics | `LogisticsPage`, `ShipmentTracker` |
| Receipts | invoice/document generation in [src/routes/app.invoices.tsx](../src/routes/app.invoices.tsx) |
| Containers | order and product data models in demo data |
| Inbox | `InboxPage` |

---

## Section 4 — Button & interaction inventory

This section covers the important interactive elements by page. It is a route-level assessment rather than a pixel-perfect inventory of every tiny icon button.

### `/` landing

| Element | Type | Location | Action | Wired? | Notes |
|---|---|---|---|---|---|
| Open dashboard | Link | Header CTA | Navigates to `/app` | ✅ | working |
| Problem/Platform/Flow anchors | Link/anchor | Header nav | Scrolls to sections | ✅ | working |
| Hero CTA | Link button | Hero | `/app` | ✅ | working |
| See workflow | Anchor button | Hero | Scroll to `#flow` | ✅ | working |

### `/login`

| Element | Type | Location | Action | Wired? | Notes |
|---|---|---|---|---|---|
| Return home | Link | header/content | `/` | ✅ | working |
| Submit magic-link form | Form submit | login form | calls `signInWithMagicLink` | ✅ | working if Supabase configured |
| Contact admin on WhatsApp | Link | registration block | Opens WhatsApp | ✅ | link-out only |
| Sign-in status banner | UI state | form area | none | ✅ | informative |

### `/auth/callback`

| Element | Type | Location | Action | Wired? | Notes |
|---|---|---|---|---|---| 
| session exchange | effect | callback page | exchange code and redirect | ✅ | works if auth code present |
| redirect to `/app` | navigate | callback | router redirect | ✅ | working |
| redirect to `/login` | navigate | callback failure | fallback | ✅ | working |

### `/portal/$token`

| Element | Type | Location | Action | Wired? | Notes |
|---|---|---|---|---|---|
| Tabs: Overview/Orders/Payments | button | portal header | toggles tab | ✅ | working |
| Payment link to order | button | payment card | set tab and order expansion | ✅ | working |
| Expand order card | button | order list | toggles details | ✅ | working |
| Shipment photo links | anchor | photo gallery | open image in new tab | ✅ | working |

### `/app` dashboard

| Element | Type | Location | Action | Wired? | Notes |
|---|---|---|---|---|---|
| Sidebar nav | Link | left navigation | navigate to app sections | ✅ | working |
| Search/menu/mobile nav | buttons | header/mobile | dropdown/side sheet | ✅ | working |
| Quick actions | Link card | dashboard | navigate to routes | ✅ | working |
| Range selector `7d/30d/90d` | button | dashboard filter | update date range | ✅ | working |
| View all recent orders | Link | recent orders header | `/app/orders` | ✅ | working |
| Attention links | Link | risk banner | route to sourcing/logistics | ✅ | working |

### `/app/orders` and `/app/orders/$id`

| Element | Type | Location | Action | Wired? | Notes |
|---|---|---|---|---|---|
| New order in generic CRUD | button | table header | opens create form | ✅ | localStorage-backed |
| Edit order row | row click / action | table row | update form | ✅ | working |
| Delete order | row action | row menu | remove item | ✅ | working |
| Order code link | Link | table row | open detail | ✅ | working |
| Advance stage | Button | detail header | update status and add tracking note | ✅ | working |
| Message client | Link | detail header | route to inbox | ⚠️ | link exists but not connected to conversation context |
| Add inspection update | Link | related sidebar | route to logistics | ⚠️ | route exists but no specific create flow |

### `/app/sourcing` and `/app/sourcing/$id`

| Element | Type | Location | Action | Wired? | Notes |
|---|---|---|---|---|---|
| Create sourcing request | CRUD UI | list page | add record | ✅ | localStorage-backed |
| Select quote | action | detail page | update quote selection | ✅ | working in local state |
| Quote comparison actions | UI buttons | detail page | likely stage controls | 🟡 | partial: visual only, not backend-driven |
| Stage advancement | button | detail page | update status | ✅ | localStorage-only |

### `/app/clients`

| Element | Type | Location | Action | Wired? | Notes |
|---|---|---|---|---|---|
| Create/edit client | CRUD form | page | add/update | ✅ | working |
| Delete client | row action | list | remove record | ✅ | working |

### `/app/agents`, `/app/suppliers`, `/app/logistics`

| Element | Type | Location | Action | Wired? | Notes |
|---|---|---|---|---|---|
| Create/edit row | CRUD UI | table | add/update | ✅ | working |
| Delete item | row action | table | remove record | ✅ | working |

### `/app/payments` family

| Element | Type | Location | Action | Wired? | Notes |
|---|---|---|---|---|---|
| Payment tabs | Link | payment nav | switch subroute | ✅ | working |
| New payment | Link | payments overview | route to `/app/payments/new` | ✅ | working |
| Create payment | form submit | new payment page | localStorage write | ✅ | working |
| Edit payment | row action/detail | detail page | update payment | ✅ | working |
| Delete payment | row action | detail page | remove | ✅ | working |
| recurring schedule form | form submit | recurring page | localStorage write | ✅ | working |
| commissions/ledger | tabs/pages | subroutes | read/report ledger values | ✅ | demo view |

### `/app/invoices`

| Element | Type | Location | Action | Wired? | Notes |
|---|---|---|---|---|---|
| Generate invoice | form submit | invoice page | create record + browser PDF | ✅ | local-only, not backend |
| Mark as paid | button | invoice page | update status | ✅ | localStorage-only |
| Download invoice | link/button | invoice page | browser download | ✅ | works only in-browser |

### `/app/fx`, `/app/market`, `/app/reports`, `/app/inbox`, `/app/brand`, `/app/settings`

| Page | Key elements | Status |
|---|---|---|
| `/app/fx` | price/rate editing | ✅ local form |
| `/app/market` | charts and market cards | ✅ static demo UI |
| `/app/reports` | KPI tables and charts | ✅ static demo UI |
| `/app/inbox` | conversation list | ✅ local-only UI |
| `/app/brand` | tagline checker | ✅ server function works, but not a real AI backend integration surface |
| `/app/settings` | preferences save/reset | ✅ localStorage-based |

### Sort/filter/pagination notes

- No pagination system is implemented in the CRUD-backed table patterns.
- No server-side sorting/filtering was found; filtering is mostly front-end and static.
- `Dashboard` has a date range toggle (`7d`, `30d`, `90d`), but it recalculates from demo data only.
- Most list screens are client-only, browser-sorted by in-memory records when rendered.

---

## Section 5 — User flows end to end

### Flow 1: New visitor → first contact

ASCII flow:

```text
/ -> landing page -> /login -> /auth/callback -> /app
```

- Data touched: landing page metadata, sign-in email, session state.
- Status: Partial.
- Gaps: no lead capture backend, no CRM, no registration workflow beyond WhatsApp admin link.

### Flow 2: Login → dashboard

```text
/login -> Supabase magic link -> /auth/callback -> /app -> /app/
```

- Data touched: `auth.signInWithOtp`, session cookie, `localStorage` preferences.
- Status: Working in principle, but depends on valid env config.
- Gaps: no hardened tenant enforcement, no server-side route protection beyond client-side session check.

### Flow 3: Create sourcing request (intake form)

```text
/app/sourcing -> create form -> localStorage
```

- Data touched: `tradehub:sourcing-requests:v1`, `usePersistentList`, demo data.
- Status: Partial.
- Gaps: no real intake workflow, no supplier RFQ dispatch, no persisted file uploads or AI matching pipeline.

### Flow 4: View sourcing detail + select quote

```text
/app/sourcing -> /app/sourcing/$id -> quote matrix -> update selected quote
```

- Data touched: sourcing request row, quote comparison state, status updates.
- Status: Partial.
- Gaps: not wired to real quote records, supplier scoring, or state machine persistence.

### Flow 5: Sourcing → order conversion

```text
/app/sourcing/$id -> order creation action -> /app/orders/$id
```

- Data touched: purchase order demodata and localStorage order collection.
- Status: Partial/inferred; a UI narrative exists but no strict conversion flow is backed by a server process.
- Gaps: no canonical `order creation` API or validation chain.

### Flow 6: Order lifecycle stage advancement

```text
/app/orders/$id -> Advance stage -> set next status -> append tracking update -> localStorage
```

- Data touched: order status, tracking updates, date stamps.
- Status: Working in-browser.
- Gaps: no audit trail, no tenancy isolation, no immutable lifecycle controls, no backend event bus.

### Flow 7: Record a payment

```text
/app/payments/new -> PaymentForm -> /app/payments/$id
```

- Data touched: payment amount, date, reference, method, proof images, localStorage.
- Status: Working in-browser.
- Gaps: no provider integration, no reconciliation, no ledger accounting backend.

### Flow 8: Create invoice

```text
/app/invoices -> create invoice -> browser PDF generation -> localStorage
```

- Data touched: document metadata, selected order info, invoice record.
- Status: Partial.
- Gaps: no PDF generation service or real document storage; no multi-tenant records.

### Flow 9: Client portal tracking

```text
/token portal link -> /portal/$token -> client overview -> orders/payments
```

- Data touched: client name lookup in `clients`, linked orders, payment filtering.
- Status: Partial.
- Gaps: no secure token issuance, no revocation, no per-tenant scoping, no real auth for portal access.

### Flow 10: Logout

```text
/app -> sign out action -> /login
```

- Data touched: Supabase session.
- Status: Not directly wired in the current app shell; sign-out helper exists in [src/lib/auth.ts](../src/lib/auth.ts) but no route UI invokes it.
- Gaps: no visible sign-out control in the app layout.

---

## Section 6 — Backend inventory

### 6A. Database tables

The repo does not contain a checked-in `supabase/migrations` directory or any SQL table definitions for business tables. The only database schema in the repo is Prisma, and the tables there are intelligence-oriented models.

| Table | Columns | Rows (prod est.) | Purpose |
|---|---|---:|---|
| `ProductKnowledge` | 18+ | unknown | product category intelligence and supplier matching |
| `SupplierScore` | 15+ | unknown | supplier quality and score aggregation |
| `LogisticsScore` | 15+ | unknown | logistics partner scoring |
| `DraftQuote` | 21+ | unknown | quote drafting and FX-aware margin evaluation |
| `MessageQueue` | 20+ | unknown | outbound messaging queue |
| `RfqBatch` | 13+ | unknown | supplier quote batch workflow |

Verified schema: [prisma/schema.prisma](../prisma/schema.prisma)

#### Prisma model details

- `ProductKnowledge` includes tenant scoping, category metadata, keyword arrays, price/weight/CBM fields, supplier linkage, scoring, and review flags.
- `SupplierScore`, `LogisticsScore`, and `DraftQuote` are designed around tenant-specific evaluation and pricing workflows.
- `MessageQueue` is set up for channel-aware outbound communications.
- `RfqBatch` supports a supplier quote batch and selection process.

### 6B. Functions

No Postgres functions were found under a `supabase/migrations` directory. The repo does not include SQL migration definitions for functions or policies.

### 6C. RLS policies

No RLS policies or Supabase SQL policies were found in the workspace. This is a material gap for a multi-tenant system.

### 6D. Database indexes

Prisma schema includes indexes for:

- `ProductKnowledge`: `@@index([tenantId, category])`
- `MessageQueue`: `@@index([tenantId, status, createdAt])`
- Unique constraints: `ProductKnowledge`, `SupplierScore`, `LogisticsScore`, `DraftQuote`, `RfqBatch`

### 6E. API routes

No current `src/routes/api` directory exists. No standard TanStack route-based API route was found. The closest API pattern is the server function layer and response helper library.

| Method | Path | Purpose | Auth | Input | Output | Status |
|---|---|---|---|---|---|---|
| `POST` | server function `checkTagline` | AI tagline validation | `requireSession` check is present but not enforced in app logic | canonical + copy | tagline result payload or error envelope | Partial |
| none | no `src/routes/api` | not implemented | n/a | n/a | n/a | stub |

### 6F. Server functions

| Function | File | Purpose | Status |
|---|---|---|---|
| `checkTagline` | [src/lib/tagline-check.functions.ts](../src/lib/tagline-check.functions.ts) | validates taglines via AI and auth check | Partial |
| `createRequireSession` | [src/lib/auth/require-session.ts](../src/lib/auth/require-session.ts) | standard bearer-token session verification | Partial, not connected to routes |

---

## Section 7 — Data layer

### 7A. Supabase clients

| File | Purpose | Imported by | Server-only |
|---|---|---|---|
| [src/lib/supabase/client.ts](../src/lib/supabase/client.ts) | browser Supabase client for authentication and session checks | login flow, callback flow, app shell | No |
| [src/lib/supabase/server.ts](../src/lib/supabase/server.ts) | server-side auth client for bearer token verification | auth guard helper | Yes |

Observations:

- Browser auth is configured via `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in [wrangler.jsonc](../wrangler.jsonc).
- No service-role client or admin-only Supabase provider exists in the repository.
- No business data tables are queried through Supabase in the checked-in app.

### 7B. Auth helpers

| File | Purpose |
|---|---|
| [src/lib/auth.ts](../src/lib/auth.ts) | sign-in, sign-out, getSession, getUser wrappers |
| [src/lib/auth/require-session.ts](../src/lib/auth/require-session.ts) | verifies bearer token and enforces tenant metadata |
| [src/lib/supabase/server.ts](../src/lib/supabase/server.ts) | supplies a server-side client for auth calls |

### 7C. Domain schemas

| File | Exports |
|---|---|
| [src/domain/intelligence/product-knowledge.ts](../src/domain/intelligence/product-knowledge.ts) | `ProductKnowledgeSchema`, `ProductKnowledge`, `canTransitionProductKnowledge`, `createProductKnowledge` |
| [src/domain/intelligence/draft-quote.ts](../src/domain/intelligence/draft-quote.ts) | quote validation and transition helpers |
| [src/domain/intelligence/logistics-score.ts](../src/domain/intelligence/logistics-score.ts) | logistics scoring schema |
| [src/domain/intelligence/supplier-score.ts](../src/domain/intelligence/supplier-score.ts) | supplier score schema |
| [src/domain/intelligence/rfq-batch.ts](../src/domain/intelligence/rfq-batch.ts) | RFQ batch schema |
| [src/domain/intelligence/message-queue.ts](../src/domain/intelligence/message-queue.ts) | message queue schema |
| [src/domain/intelligence/transitions.ts](../src/domain/intelligence/transitions.ts) | generic state transition helpers |

### 7D. Services

| Service | File | Purpose | Wired to app? |
|---|---|---|---|
| `VisionService` | [src/services/intelligence/vision.service.ts](../src/services/intelligence/vision.service.ts) | image-classification service with mock/remote fallback | No app caller found in routes |
| `matchProductKnowledge` | [src/services/intelligence/matcher.service.ts](../src/services/intelligence/matcher.service.ts) | score product knowledge records against request signals | Partial; tests only |
| `store` | [src/services/intelligence/store.ts](../src/services/intelligence/store.ts) | state/store helpers | Unclear; not wired in this checkout |

### 7E. `localStorage` usage

The repo uses `usePersistentList` as a browser persistence abstraction to store application state by collection name.

| Use | Storage key | Purpose |
|---|---|---|
| orders | `tradehub:orders:v1` | order lifecycle tracking |
| payments | `tradehub:payments:v1` | payment record management |
| sourcing requests | `tradehub:sourcing-requests:v1` | sourcing workflow state |
| clients | `tradehub:clients:v1` | client directory |
| suppliers | `tradehub:suppliers:v1` | supplier directory |
| agents | `tradehub:agents:v1` | agent directory |
| logistics | `tradehub:logistics:v1` | logistics partner directory |
| invoices | `tradehub:invoices:v1` | invoice documents |
| conversations | `tradehub:conversations:v1` | inbox records |
| preferences | `tradehub:preferences:v1` | user settings |
| fx rates | `tradehub:fx-rates:v1` | FX values |

Implementation: [src/lib/use-persistent-list.ts](../src/lib/use-persistent-list.ts)

---

## Section 8 — Design system

### 8A. Colors

Verified from [src/styles.css](../src/styles.css) `@theme` block:

| Token | Value |
|---|---|
| `--color-bg` | `#f8fafc` |
| `--color-bg-elev-1` | `#ffffff` |
| `--color-bg-elev-2` | `#ffffff` |
| `--color-bg-glass` | `rgba(255, 255, 255, 0.7)` |
| `--color-bg-glass-hover` | `rgba(255, 255, 255, 0.9)` |
| `--color-primary` | `#e55a2b` |
| `--color-primary-hover` | `#ff6b35` |
| `--color-accent` | `#0d9488` |
| `--color-accent-hover` | `#14b8a6` |
| `--color-status-success` | `#059669` |
| `--color-status-info` | `#2563eb` |
| `--color-status-warn` | `#d97706` |
| `--color-status-danger` | `#dc2626` |
| `--color-status-muted` | `#64748b` |
| `--color-fg` | `#0f172a` |
| `--color-fg-muted` | `#334155` |
| `--color-fg-subtle` | `#64748b` |
| `--color-fg-faint` | `#94a3b8` |
| `--color-border` | `#e2e8f0` |
| `--color-border-strong` | `#cbd5e1` |
| `--color-border-accent` | `rgba(13, 148, 136, 0.3)` |
| `--radius-sm` | `6px` |
| `--radius-md` | `10px` |
| `--radius-lg` | `14px` |
| `--radius-xl` | `20px` |
| `--font-sans` | `Inter` |
| `--font-mono` | `JetBrains Mono` |

### 8B. Typography

- Font families: Inter + JetBrains Mono, via CSS variables in [src/styles.css](../src/styles.css).
- Primary UI uses sans serif, monospaced values for order codes and finance metrics.
- Body and headings rely on a dark/light neutral design but the default experience is a dark, glassy style via layered gradients and surfaces.

### 8C. Spacing & radius scale

- radius scale: `sm 6px`, `md 10px`, `lg 14px`, `xl 20px`
- spacing is handled via Tailwind utility classes rather than a custom spacing scale.
- Card and panel components follow a conservative 12–20px rhythm.

### 8D. Component design patterns

- Card anatomy: glass card surface, soft border, head + content, optional actions.
- Button variants: default, glass, accent, destructive patterns via app-level button wrappers.
- Badge variants: `accent`, `warning`, `success`, `danger`, `muted`, `info` in [src/components/kit.tsx](../src/components/kit.tsx).
- Table row anatomy: border separators, status pill, values with mono styling where needed.

### 8E. Dark/light mode

- This app is designed primarily as a dark mode surface, though the design tokens in `src/styles.css` include a light token set with glass backgrounds.
- There is no explicit light-mode toggle implemented in the checked-in app.

---

## Section 9 — Security audit

| Area | Status | Notes |
|---|---|---|
| Auth required on all `/app` routes | Partial | Client-side session check exists in [src/routes/app.tsx](../src/routes/app.tsx) but is not a server-side enforcement layer |
| Auth required on all `/api` routes | Not implemented | There are no `/api` routes in this checkout |
| Tenant scoping on all queries | Partial | `requireSession` checks `tenant_id`, but no actual DB or route wiring implements it |
| RLS enabled on all tables | Missing | No SQL migrations or policies found |
| Service role key server-only | Not present | No service-role client was found |
| Secrets in git | Risk | `wrangler.jsonc` contains a public Supabase anon key and URL; the key is public by design but should not be treated as privileged |
| Input validation (`Zod .strict`) | Partial | Some schemas use `.strict()`, but not consistently across browser forms |
| Rate limiting | Missing | None found |
| CSRF protection | Not applicable / missing | This is a browser app without full server token patterns |
| Webhook signature verification | Missing | None found |
| PII in logs | Partial | logging utility exists; no evidence of secrets in logs, but caution is required |
| XSS protection | Moderate | React escapes content; image URLs are user-supplied but render via `img` tags and `target=_blank` |
| SQL injection | Not applicable in this repo | No live data layer calls were found in this checkout |

### Findings with file references

| Severity | File | Finding | Recommendation |
|---|---|---|---|
| Medium | [src/routes/app.tsx](../src/routes/app.tsx) | Session check runs in browser only; it does not enforce auth server-side on protected routes. | Add server middleware or route guards to every sensitive route and API entrypoint. |
| High | [src/lib/auth/require-session.ts](../src/lib/auth/require-session.ts) | Tenant enforcement is implemented as a helper only; no database or route uses it. | Wire `requireSession` to all protected resource APIs and confirm tenant ownership on each query. |
| Medium | [wrangler.jsonc](../wrangler.jsonc) | Public anon key is in build config; ensure not mixed with service-role credentials. | keep only anon/public config in client-facing deployment settings and separate service credentials server-side. |
| Medium | [src/lib/use-persistent-list.ts](../src/lib/use-persistent-list.ts) | All state is stored in browser `localStorage`, which is not secure multi-user persistence. | Move to a real tenant-scoped database and authenticated backend before production. |

---

## Section 10 — Performance audit

### 10A. Bundle analysis

Verified with `npm run build`.

The build completed successfully; the output is not a single app bundle but a static Vite/TanStack output with route chunks generated by the build system. The exact chunk breakdown is available in the build log and the generated `.output` folder. The app is not yet optimized for a large production workload.

### 10B. Route-level code splitting

- TanStack Router is present and file-based routes are used.
- Code splitting is handled by the router/build stack, but no explicit manual lazy-loading strategy is obvious from the checked-in route definitions.
- Most routes are direct component files and not preloaded with `React.lazy` wrappers.

### 10C. Image optimization

- Product and photo previews are loaded with `loading="lazy"` in several detail views.
- No CDN or transformed image pipeline was found.
- No `next/image`-style optimization is used because this is not a Next.js app.

### 10D. Caching strategy

- TanStack Query is installed, but no app-level query cache configuration or server-state layer is wired in the current checkout.
- No service worker was found.
- No HTTP cache headers or custom caching policy was found in the repo.

### 10E. Database query patterns

- No live database queries or server-side data layer were found.
- No SQL call patterns or endpoints were found to produce N+1 or unbounded DB queries.
- This is effectively a UI + local browser state app at present; the performance risks are related to future backend integration, not current checked-in code.

---

## Section 11 — Test coverage

### List of test files

| Test file | What it tests | Cases | Status |
|---|---|---:|---|
| [src/lib/api/__tests__/respond.test.ts](../src/lib/api/__tests__/respond.test.ts) | API response envelopes and helper status codes | 5+ | ✅ pass |
| [src/lib/api/__tests__/validation.test.ts](../src/lib/api/__tests__/validation.test.ts) | request validation helpers and strict schema behavior | 5+ | ✅ pass |
| [src/lib/auth/__tests__/require-session.test.ts](../src/lib/auth/__tests__/require-session.test.ts) | bearer-token verification and tenant enforcement | 5+ | ✅ pass |
| [src/lib/__tests__/logger.test.ts](../src/lib/__tests__/logger.test.ts) | structured logging behavior | 1+ | ✅ pass |
| [src/services/intelligence/__tests__/matcher.test.ts](../src/services/intelligence/__tests__/matcher.test.ts) | product-knowledge matching logic | 7+ | ✅ pass |
| [src/services/intelligence/__tests__/vision.test.ts](../src/services/intelligence/__tests__/vision.test.ts) | VisionService classification, retries, cache, validation | 10+ | ✅ pass |

### Verified test run output

```bash
npm test
```

```text
✔ logError emits structured metadata without error messages or stacks
✔ ok returns the data envelope and requested status
✔ fail returns the error envelope and status
✔ handleError converts Zod errors to a detailed 400 response
✔ handleError passes through Response errors unchanged
✔ handleError returns a generic 500 for unknown errors
✔ strict client contact schema rejects unknown fields
✔ missing required client fields produce useful validation errors
✔ Kenyan phone numbers normalize to E.164
✔ currency schema accepts supported currencies and rejects others
✔ missing authorization header returns 401
✔ invalid access token returns 401
✔ valid user without tenant metadata returns 403
✔ valid tenant session returns user and tenant context
✔ matchProductKnowledge ranks the closest product knowledge record first
✔ ...

ℹ tests 29
ℹ pass 29
ℹ fail 0
```

### What is not tested

- no route E2E tests for dashboard, payments, or order workflow
- no API contract tests for real resource endpoints (none exist)
- no browser-state persistence tests for `localStorage`
- no Supabase integration tests
- no Cloudflare deployment config tests
- no RLS tests
- no multi-tenant authorization tests beyond session helper unit tests

### Recommended test priority

1. App route auth/integration smoke tests
2. localStorage CRUD persistence tests
3. portal token security tests
4. order lifecycle transition tests
5. payment/invoice reconciliation tests
6. DB migration + tenant policy tests once backend is introduced

---

## Section 12 — Dependency inventory

### 12A. Runtime dependencies

From [package.json](../package.json):

| Package | Version | Purpose | Actually used? |
|---|---|---|---|
| `@ai-sdk/openai` | `^4.0.91` | AI model client | likely not wired in current app |
| `@hookform/resolvers` | `^5.2.2` | form validation | yes, used in client-side schemas |
| `@radix-ui/*` | many packages | primitive UI components | yes |
| `@supabase/ssr` | `^0.12.7` | Supabase SSR helpers | partial |
| `@supabase/supabase-js` | `^2.117.2` | browser and server auth client | yes |
| `@tanstack/react-query` | `^5.101.1` | server state caching | installed, not fully used |
| `@tanstack/react-router` | `1.170.18` | route management | yes |
| `@tanstack/react-start` | `1.168.32` | app server/runtime | yes |
| `ai` | `^7.0.136` | AI SDK | partial |
| `clsx` | `^2.1.1` | class helper | yes |
| `date-fns` | `^4.1.0` | date formatting | yes |
| `lucide-react` | `^0.575.0` | icons | yes |
| `react` | `^19.2.0` | UI framework | yes |
| `react-hook-form` | `^7.71.2` | form handling | yes |
| `recharts` | `^2.15.4` | charts | yes |
| `sonner` | `^2.0.7` | toasts | likely present for future UX |
| `tailwindcss` | `^4.2.1` | styling | yes |
| `zod` | `^3.25.76` | validation | yes |

### 12B. Dev dependencies

| Package | Purpose |
|---|---|
| `@vitejs/plugin-react` | Vite React plugin |
| `eslint`, `typescript`, `prettier`, `vite` | dev toolchain |
| `@types/node`, `@types/react`, `@types/react-dom` | TS types |
| `nitro` | server runtime |
| `@lovable.dev/vite-tanstack-config` | Lovable build integration |

### 12C. Unused dependencies

The workspace does not currently show a broad set of unused runtime packages, but some are likely not yet wired into the product flow or only used in tests/integration scaffolding:

- `@ai-sdk/openai`: likely not called in main app flows
- `@tanstack/react-query`: installed but not active in UI queries
- `sonner`: present but no evidence of toast usage in route flows
- `recharts`: present but not used widely by route screens in this checkout

### 12D. Outdated dependencies

The repo was not queried with `npm outdated` during this audit. This should be run in a full dependency review before production readiness assessment.

---

## Section 13 — Deployment & operations

### 13A. Deployment pipeline

| Setting | Value |
|---|---|
| Cloudflare config | [wrangler.jsonc](../wrangler.jsonc) |
| Build command | `npm run build` |
| Deploy command | Not explicitly configured in repo; Cloudflare deployment is implied via Wrangler in build output |
| Env vars | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |

The deployment target is Cloudflare Workers. Asset output is written to `.output/public` and the worker entrypoint is `.output/server/index.mjs`.

### 13B. Monitoring

- `observability: { enabled: true }` is set in [wrangler.jsonc](../wrangler.jsonc).
- No Sentry/Datadog/PostHog integration was found in the checked-in code.
- No dedicated uptime monitor or health check endpoint was found.

### 13C. Health checks

- No `/api/health` endpoint is present.
- No DB connectivity health check is implemented.

### 13D. Backups / rollback plan

- No database backup strategy was found in the repo.
- No rollback or migration strategy was found for production schema changes.
- The repo currently relies on static local state and demo data; there is no verified production database operational playbook.

---

## Section 14 — Gaps & missing features

### 14A. Backend gaps

| Missing | Needed by | Priority |
|---|---|---|
| real tenanted database schema | all business data | P0 |
| server-side auth enforcement for `/app` and business APIs | every protected feature | P0 |
| persisted sourcing, orders, payments, invoices, and clients | app workflow | P0 |
| webhook and messaging integrations | WhatsApp/WeChat notifications | P1 |
| payment and M-Pesa provider integration | actual payments | P1 |
| PDF generation service | invoices and quotes | P1 |
| file storage for proof images | shipment and payment records | P1 |
| RLS + migration system | production readiness | P0 |

### 14B. Frontend gaps

| Missing | Needed By | Priority |
|---|---|---|
| real app data fetching layer | all screens | P0 |
| loading/error states for all subpages | UX | P1 |
| sign-out action in app shell | user experience | P1 |
| route-level loading and form validation patterns | robustness | P1 |
| final service integration for quote/messaging selection | operations | P1 |

### 14C. Integration gaps

| Integration | Status | Priority |
|---|---|---|
| Supabase Auth | Partial | P1 |
| Supabase DB | Missing | P0 |
| WhatsApp inbound | Missing | P1 |
| WhatsApp outbound | Partial link-out only | P1 |
| WeChat Work outbound | Missing | P1 |
| AI image extraction | Partial service and tests, no app wiring | P1 |
| Payment provider | Missing | P0 |
| PDF invoices | Partial local generation, no backend store | P1 |
| Client portal | Partial static / demo | P1 |

### 14D. Feature gaps from product spec

| Product spec item | Status |
|---|---|
| Intake form → DB persistence | Missing |
| AI screenshot extraction | Partial service files and tests, no route wiring |
| WhatsApp inbound | Missing |
| WhatsApp outbound | Partial link-out only |
| WeChat Work outbound | Missing |
| Supplier RFQ | Partial UI only |
| Quote comparison | Partial UI only |
| Order lifecycle | Partial in-browser demo state |
| Payment recording | Partial local-storage workflow |
| M-Pesa webhook | Missing |
| PDF invoices | Partial browser-side generation |
| Client portal (real) | Partial demo portal |
| Market analysis | Static demo UI |
| Reports | Static demo UI |
| Multi-tenant SaaS | Not yet implemented in live backend |

---

## Section 15 — Honest verdict

1. What is TradeHub, in one sentence?

   TradeHub is a concept/UI prototype for a multi-tenant operational workspace that helps Kenyan importers source goods from China, compare quotes, track orders, manage payments, and monitor shipments.

2. What is TradeHub NOT, in one sentence?

   TradeHub is not yet a production-ready SaaS with real tenant data persistence, server-side auth enforcement, or live operational integrations.

3. How many weeks of focused work separate this codebase from a live system that processes real client orders?

   Roughly 6–12 weeks of focused backend and integration work would be required to convert this into a production-grade order-processing system, assuming a full schema and workflow implementation begins from this codebase; this estimate is conservative and depends on system architecture constraints.

4. What are the top 3 blockers?

   The top blockers are: (1) the lack of a real persisted tenanted backend and migration system, (2) no server-enforced route/API auth on top of the current browser-only session model, and (3) no payment, messaging, or ERP-style operational integrations.

5. What is the single most important thing to build next?

   The single most important next step is to implement a real tenant-scoped database and authenticated API layer for sourcing, orders, and payments, because every other workflow depends on a trustworthy data model and authorization boundary.

---

Last updated: 2026-10-14
