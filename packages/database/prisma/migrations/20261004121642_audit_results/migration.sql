/*
  Warnings:

  - You are about to drop the column `manifestObjectKey` on the `DesignSource` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Audit" DROP CONSTRAINT "Audit_designSourceId_fkey";

-- AlterTable
ALTER TABLE "Audit" ADD COLUMN     "counts" JSONB,
ADD COLUMN     "issueCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "parentAuditId" TEXT,
ADD COLUMN     "progress" JSONB,
ADD COLUMN     "unresolvedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "warnings" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "DesignSource" DROP COLUMN "manifestObjectKey",
ADD COLUMN     "frames" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "uploadObjectKey" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "sourceRepository" JSONB,
ALTER COLUMN "ownerId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "viewportId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "property" TEXT NOT NULL,
    "elementName" TEXT NOT NULL,
    "designId" TEXT,
    "implementationId" TEXT,
    "position" INTEGER NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "issueIds" JSONB NOT NULL,
    "payload" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Issue_auditId_viewportId_category_idx" ON "Issue"("auditId", "viewportId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "Issue_auditId_issueId_key" ON "Issue"("auditId", "issueId");

-- CreateIndex
CREATE UNIQUE INDEX "Recommendation_cacheKey_key" ON "Recommendation"("cacheKey");

-- CreateIndex
CREATE INDEX "Recommendation_auditId_idx" ON "Recommendation"("auditId");

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_designSourceId_fkey" FOREIGN KEY ("designSourceId") REFERENCES "DesignSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
