CREATE TYPE "AgencyInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');
CREATE TYPE "LeadActivityType" AS ENUM ('NOTE', 'CALL', 'EMAIL', 'WHATSAPP', 'TASK', 'REMINDER');
CREATE TYPE "LeadActivityStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELED');
CREATE TYPE "VisitStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELED', 'NO_SHOW');

ALTER TABLE "Lead" ADD COLUMN "assignedMemberId" TEXT;
ALTER TABLE "Lead" ADD COLUMN "assignedUserId" TEXT;

CREATE TABLE "AgencyInvitation" (
  "id" TEXT NOT NULL,
  "agencyId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "AgencyMemberRole" NOT NULL,
  "token" TEXT NOT NULL,
  "status" "AgencyInvitationStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "invitedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgencyInvitation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadHistory" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "field" TEXT NOT NULL,
  "fromValue" TEXT,
  "toValue" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadActivity" (
  "id" TEXT NOT NULL,
  "agencyId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "LeadActivityType" NOT NULL,
  "status" "LeadActivityStatus" NOT NULL DEFAULT 'PENDING',
  "title" TEXT NOT NULL,
  "description" TEXT,
  "dueAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PropertyVisit" (
  "id" TEXT NOT NULL,
  "agencyId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "assignedMemberId" TEXT,
  "createdById" TEXT NOT NULL,
  "assignedUserId" TEXT,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "durationMinutes" INTEGER NOT NULL DEFAULT 60,
  "status" "VisitStatus" NOT NULL DEFAULT 'SCHEDULED',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PropertyVisit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgencyInvitation_token_key" ON "AgencyInvitation"("token");
CREATE INDEX "AgencyInvitation_agencyId_status_idx" ON "AgencyInvitation"("agencyId", "status");
CREATE INDEX "AgencyInvitation_email_status_idx" ON "AgencyInvitation"("email", "status");
CREATE INDEX "Lead_assignedMemberId_idx" ON "Lead"("assignedMemberId");
CREATE INDEX "Lead_assignedUserId_idx" ON "Lead"("assignedUserId");
CREATE INDEX "LeadHistory_leadId_createdAt_idx" ON "LeadHistory"("leadId", "createdAt");
CREATE INDEX "LeadActivity_leadId_createdAt_idx" ON "LeadActivity"("leadId", "createdAt");
CREATE INDEX "LeadActivity_agencyId_status_dueAt_idx" ON "LeadActivity"("agencyId", "status", "dueAt");
CREATE INDEX "PropertyVisit_agencyId_scheduledAt_idx" ON "PropertyVisit"("agencyId", "scheduledAt");
CREATE INDEX "PropertyVisit_leadId_idx" ON "PropertyVisit"("leadId");
CREATE INDEX "PropertyVisit_assignedMemberId_scheduledAt_idx" ON "PropertyVisit"("assignedMemberId", "scheduledAt");

ALTER TABLE "AgencyInvitation" ADD CONSTRAINT "AgencyInvitation_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgencyInvitation" ADD CONSTRAINT "AgencyInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedMemberId_fkey" FOREIGN KEY ("assignedMemberId") REFERENCES "AgencyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LeadHistory" ADD CONSTRAINT "LeadHistory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadHistory" ADD CONSTRAINT "LeadHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropertyVisit" ADD CONSTRAINT "PropertyVisit_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropertyVisit" ADD CONSTRAINT "PropertyVisit_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropertyVisit" ADD CONSTRAINT "PropertyVisit_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropertyVisit" ADD CONSTRAINT "PropertyVisit_assignedMemberId_fkey" FOREIGN KEY ("assignedMemberId") REFERENCES "AgencyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PropertyVisit" ADD CONSTRAINT "PropertyVisit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropertyVisit" ADD CONSTRAINT "PropertyVisit_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
