/*
  Warnings:

  - A unique constraint covering the columns `[studentId,subjectId,quarterId]` on the table `Mark` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Mark_studentId_subjectId_quarterId_key" ON "Mark"("studentId", "subjectId", "quarterId");
