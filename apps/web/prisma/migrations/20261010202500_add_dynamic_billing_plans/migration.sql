-- CreateTable
CREATE TABLE "BillingPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "priceIdr" INTEGER NOT NULL,
    "intervalMonths" INTEGER NOT NULL DEFAULT 1,
    "emailQuota" INTEGER NOT NULL DEFAULT 10000,
    "domainLimit" INTEGER NOT NULL DEFAULT 1,
    "teamMemberLimit" INTEGER NOT NULL DEFAULT 3,
    "features" TEXT[],
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingPlan_slug_key" ON "BillingPlan"("slug");

-- AlterTable
ALTER TABLE "Team" ADD COLUMN "billingPlanId" TEXT;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_billingPlanId_fkey" FOREIGN KEY ("billingPlanId") REFERENCES "BillingPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
