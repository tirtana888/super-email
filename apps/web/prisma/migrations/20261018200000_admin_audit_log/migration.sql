-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" INTEGER,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "teamId" INTEGER,
    "details" JSONB NOT NULL,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminAuditLog_teamId_createdAt_idx" ON "AdminAuditLog"("teamId", "createdAt");
