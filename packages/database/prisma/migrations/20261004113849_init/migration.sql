-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('QUEUED', 'INSPECTING_WEBSITE', 'IMPORTING_DESIGN', 'NORMALIZING', 'MATCHING', 'COMPARING', 'VISUAL_DIFF', 'AI_RECOMMENDATIONS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StageRunStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "DesignSourceType" AS ENUM ('FIGMA', 'ADOBE_XD');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignSource" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "DesignSourceType" NOT NULL,
    "name" TEXT NOT NULL,
    "uri" TEXT,
    "externalId" TEXT,
    "revision" TEXT,
    "manifestObjectKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Audit" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "designSourceId" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "targetNodeId" TEXT,
    "status" "AuditStatus" NOT NULL DEFAULT 'QUEUED',
    "viewports" JSONB NOT NULL,
    "settings" JSONB NOT NULL,
    "inputHash" TEXT NOT NULL,
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditStageRun" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "stage" "AuditStatus" NOT NULL,
    "viewportId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "status" "StageRunStatus" NOT NULL DEFAULT 'PENDING',
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "metrics" JSONB,
    "artifactKeys" JSONB,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditStageRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Project_ownerId_idx" ON "Project"("ownerId");

-- CreateIndex
CREATE INDEX "DesignSource_projectId_idx" ON "DesignSource"("projectId");

-- CreateIndex
CREATE INDEX "Audit_projectId_createdAt_idx" ON "Audit"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "Audit_status_idx" ON "Audit"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AuditStageRun_idempotencyKey_key" ON "AuditStageRun"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AuditStageRun_auditId_stage_idx" ON "AuditStageRun"("auditId", "stage");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignSource" ADD CONSTRAINT "DesignSource_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_designSourceId_fkey" FOREIGN KEY ("designSourceId") REFERENCES "DesignSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditStageRun" ADD CONSTRAINT "AuditStageRun_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
