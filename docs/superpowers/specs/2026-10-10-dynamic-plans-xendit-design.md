# Dynamic Plans & Xendit Billing Integration Design

## Overview
This design introduces dynamic billing plan configuration for Superadmins and integrates Xendit (QRIS & Virtual Accounts) for seamless payments in Indonesia.

## Goals
1. Allow Superadmin to dynamically create, edit, reorder, and toggle billing plans (`BillingPlan`) from `/admin/plans`.
2. Display dynamic plans to users on `/settings/billing` with localized pricing (IDR) and feature lists.
3. Integrate Xendit Invoices (Payment Link) with QRIS & Virtual Accounts so users can pay via mobile banking / e-wallets.
4. Process Xendit payment callbacks via `/api/webhook/xendit` to automatically activate subscriptions and extend quota for 30 days.

## Data Model
### `BillingPlan`
- `id`: String (cuid)
- `name`: String (e.g. "Starter", "Pro", "Enterprise")
- `slug`: String (unique, e.g. "starter", "pro")
- `description`: String?
- `priceIdr`: Int (e.g. 99000)
- `intervalMonths`: Int (default 1)
- `emailQuota`: Int (default 10000)
- `domainLimit`: Int (default 1)
- `teamMemberLimit`: Int (default 3)
- `features`: String[] (feature highlights for pricing cards)
- `isPopular`: Boolean (default false)
- `isActive`: Boolean (default true)
- `sortOrder`: Int (default 0)
- `createdAt`: DateTime (default now)
- `updatedAt`: DateTime (updatedAt)

### `Team` Extension
- Optional reference to `billingPlanId`: String?
- Retains existing `plan`: Plan enum or dynamic plan resolution.

## Architecture & Components
1. **TRPC Routers**:
   - `adminPlansRouter` (`~/server/api/routers/admin-plans.ts`):
     - `getAll`: Admin only
     - `create`: Admin only
     - `update`: Admin only
     - `delete`: Admin only
   - `billingRouter` (`~/server/api/routers/billing.ts`):
     - `getPublicPlans`: Accessible to all authenticated teams
     - `createXenditInvoice`: Generates Xendit invoice for selected plan
2. **Xendit Service (`~/server/billing/xendit.ts`)**:
   - Creates invoice via Xendit API (`POST https://api.xendit.co/v2/invoices`)
   - Verifies incoming webhook using `x-callback-token`
3. **Webhook Route (`~/app/api/webhook/xendit/route.ts`)**:
   - Receives `INVOICE.PAID` events
   - Updates `Team` and `Subscription` records
4. **UI**:
   - `/admin/plans`: Superadmin table & modal for managing plans
   - `/settings/billing`: Dynamic pricing card grid with "Upgrade / Beli Paket" button opening Xendit Checkout
