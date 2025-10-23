/*
  Warnings:

  - You are about to drop the `UserPreference` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserPreference" DROP CONSTRAINT "UserPreference_userId_fkey";

-- DropTable
DROP TABLE "UserPreference";

-- CreateTable
CREATE TABLE "userPreference" (
    "id" TEXT NOT NULL,
    "receiveEmail" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "userPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "userPreference_userId_key" ON "userPreference"("userId");

-- AddForeignKey
ALTER TABLE "userPreference" ADD CONSTRAINT "userPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
