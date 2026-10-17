-- CreateTable
CREATE TABLE "TeamOnboarding" (
    "id" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "domain" TEXT NOT NULL,
    "emailTypes" TEXT[],
    "monthlyVolume" TEXT NOT NULL,
    "useCases" TEXT[],
    "otherUseCase" TEXT,
    "language" TEXT NOT NULL DEFAULT 'id',
    "createdByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamOnboarding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamOnboarding_teamId_key" ON "TeamOnboarding"("teamId");

-- AddForeignKey
ALTER TABLE "TeamOnboarding" ADD CONSTRAINT "TeamOnboarding_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamOnboarding" ADD CONSTRAINT "TeamOnboarding_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
