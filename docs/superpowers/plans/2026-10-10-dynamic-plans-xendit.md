# Dynamic Plans & Xendit Billing Integration Implementation Plan

> **Note on Migrations**: Per repository guidelines, do not run migrations without explicit user instruction. The Prisma schema will be prepared with the new model, and we will prompt the user to approve generating/pushing migrations.

## Proposed Changes

### Phase 1: Database Model & Prisma Schema
- Add `BillingPlan` model in `apps/web/prisma/schema.prisma`
- Add `billingPlanId` optional field on `Team` model
- Ask user for permission to execute `pnpm db:generate` / `db:push`

### Phase 2: TRPC Admin Plans Router
- Create `apps/web/src/server/api/routers/admin-plans.ts`
  - `getAll`: query all billing plans sorted by `sortOrder`
  - `create`: mutation to create a plan
  - `update`: mutation to update a plan
  - `delete`: mutation to toggle/delete a plan
- Register `adminPlans` in `apps/web/src/server/api/root.ts`

### Phase 3: Xendit Service & Webhook
- Create `apps/web/src/server/billing/xendit.ts`
  - Function `createXenditInvoice({ teamId, planId, userEmail })`
  - Function `handleXenditWebhook(payload, callbackToken)`
- Add environment variables in `apps/web/src/env.js`:
  - `XENDIT_SECRET_KEY`: optional string
  - `XENDIT_CALLBACK_TOKEN`: optional string
- Create webhook endpoint `apps/web/src/app/api/webhook/xendit/route.ts`
- Add TRPC mutation in `apps/web/src/server/api/routers/billing.ts`:
  - `getAvailablePlans`: returns active `BillingPlan` records
  - `createXenditCheckoutSession`: creates Xendit invoice and returns `invoice_url`

### Phase 4: Superadmin UI (`/admin/plans`)
- Create `apps/web/src/app/(auth)/(app)/admin/plans/page.tsx`
- Add "Plans" link to Admin navigation sidebar
- Interactive modal to add/edit plans:
  - Name, slug, description, price (IDR), quota, domain limits, feature bullets, popular badge

### Phase 5: Client Billing UI (`/settings/billing`)
- Update `apps/web/src/app/(auth)/(app)/settings/billing/page.tsx` (and upgrade modal)
- Render dynamic cards from `api.billing.getAvailablePlans`
- On click "Pilih Paket", call `createXenditCheckoutSession` and redirect to Xendit invoice URL

## Verification Plan
1. Admin plans CRUD: Create a plan in `/admin/plans` and verify persistence.
2. User billing page: Check `/settings/billing` renders the created plans in IDR with formatted currency (`Rp 99.000`).
3. Checkout button: Initiates Xendit invoice generation and opens payment link with QRIS/VA options.
4. Webhook verification: Test simulated callback to activate subscription.
