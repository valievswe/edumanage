/*
  Warnings:

  - You are about to drop the column `usename` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "usename",
ADD COLUMN     "username" TEXT;
