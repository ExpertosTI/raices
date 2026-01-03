-- AlterTable
ALTER TABLE "FamilyMember" ADD COLUMN IF NOT EXISTS "nickname" TEXT;
ALTER TABLE "FamilyMember" ADD COLUMN IF NOT EXISTS "skills" TEXT[];

-- AlterTable
ALTER TABLE "RegistrationRequest" ADD COLUMN IF NOT EXISTS "nickname" TEXT;
ALTER TABLE "RegistrationRequest" ADD COLUMN IF NOT EXISTS "skills" TEXT[];
