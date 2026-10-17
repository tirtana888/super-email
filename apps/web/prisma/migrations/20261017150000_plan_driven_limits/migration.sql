-- Plan-driven limits: every team's limits come from its BillingPlan.
-- A BillingPlan row flagged isDefault is the plan new teams start on (Free).
-- -1 means "unlimited" for every limit column.

ALTER TABLE "BillingPlan"
  ADD COLUMN "emailsPerDay" INTEGER NOT NULL DEFAULT -1,
  ADD COLUMN "contactBookLimit" INTEGER NOT NULL DEFAULT -1,
  ADD COLUMN "webhookLimit" INTEGER NOT NULL DEFAULT -1,
  ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- Paid plans created before this migration got a daily cap of quota / 30 (min 100) at checkout.
-- Keep that behavior by storing it on the plan itself.
UPDATE "BillingPlan"
SET "emailsPerDay" = GREATEST(FLOOR("emailQuota" / 30.0)::integer, 100);

-- If an admin already created a plan with the slug "free", adopt it as the default.
UPDATE "BillingPlan"
SET "isDefault" = true, "priceIdr" = 0
WHERE "slug" = 'free'
  AND NOT EXISTS (SELECT 1 FROM "BillingPlan" WHERE "isDefault" = true);

-- Otherwise seed the Free plan with the limits that were previously hard-coded.
INSERT INTO "BillingPlan" (
  "id", "name", "slug", "description", "priceIdr", "intervalMonths",
  "emailQuota", "emailsPerDay", "domainLimit", "teamMemberLimit",
  "contactBookLimit", "webhookLimit", "features",
  "isPopular", "isActive", "isDefault", "sortOrder", "createdAt", "updatedAt"
)
SELECT
  'plan_free_default', 'Free', 'free', 'Paket gratis untuk mulai mengirim email', 0, 1,
  3000, 100, 1, 1,
  1, 1,
  ARRAY['3.000 email per bulan', '100 email per hari', '1 domain', '1 anggota tim']::text[],
  false, true, true, -100, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "BillingPlan" WHERE "isDefault" = true);

-- Connect every existing free team to the default plan.
UPDATE "Team"
SET "billingPlanId" = (SELECT "id" FROM "BillingPlan" WHERE "isDefault" = true LIMIT 1)
WHERE "billingPlanId" IS NULL AND "plan" = 'FREE';

-- Team.dailyEmailLimit becomes an optional admin override. NULL means "use the plan".
ALTER TABLE "Team" ALTER COLUMN "dailyEmailLimit" DROP NOT NULL;
ALTER TABLE "Team" ALTER COLUMN "dailyEmailLimit" DROP DEFAULT;
UPDATE "Team" SET "dailyEmailLimit" = NULL WHERE "dailyEmailLimit" = 10000;
