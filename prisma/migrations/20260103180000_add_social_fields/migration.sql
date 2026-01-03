-- AlterTable
ALTER TABLE "FamilyMember" ADD COLUMN     "nickname" TEXT,
ADD COLUMN     "skills" TEXT[];

-- AlterTable
ALTER TABLE "RegistrationRequest" ADD COLUMN     "nickname" TEXT,
ADD COLUMN     "skills" TEXT[];
