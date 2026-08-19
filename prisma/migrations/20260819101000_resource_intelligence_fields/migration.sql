-- AlterTable
ALTER TABLE "ResourceUtilization" ADD COLUMN "capacity" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ResourceUtilization" ADD COLUMN "demand" REAL NOT NULL DEFAULT 0;
