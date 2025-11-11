-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "tgId" TEXT NOT NULL,
    "usename" TEXT,
    "fname" TEXT,
    "lname" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_tgId_key" ON "User"("tgId");
