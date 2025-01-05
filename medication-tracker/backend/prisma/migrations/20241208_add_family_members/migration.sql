-- CreateEnum
CREATE TYPE "FamilyRelationType" AS ENUM (
    'SPOUSE',
    'CHILD',
    'PARENT',
    'SIBLING',
    'GRANDPARENT',
    'OTHER'
);

-- CreateEnum
CREATE TYPE "FamilyMemberStatus" AS ENUM (
    'PENDING',
    'ACTIVE',
    'INACTIVE'
);

-- CreateTable
CREATE TABLE "FamilyMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "relationship" "FamilyRelationType" NOT NULL,
    "status" "FamilyMemberStatus" NOT NULL DEFAULT 'PENDING',
    "inviteToken" TEXT,
    "inviteSentAt" TIMESTAMP(3),
    "inviteAcceptedAt" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3),
    "notificationPreferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMemberPermission" (
    "id" TEXT NOT NULL,
    "familyMemberId" TEXT NOT NULL,
    "canViewMedications" BOOLEAN NOT NULL DEFAULT true,
    "canEditMedications" BOOLEAN NOT NULL DEFAULT false,
    "canViewSchedule" BOOLEAN NOT NULL DEFAULT true,
    "canEditSchedule" BOOLEAN NOT NULL DEFAULT false,
    "canViewReports" BOOLEAN NOT NULL DEFAULT true,
    "canManageInventory" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyMemberPermission_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMemberPermission" ADD CONSTRAINT "FamilyMemberPermission_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "FamilyMember_inviteToken_key" ON "FamilyMember"("inviteToken");
CREATE INDEX "FamilyMember_userId_idx" ON "FamilyMember"("userId");
CREATE INDEX "FamilyMember_email_idx" ON "FamilyMember"("email");
