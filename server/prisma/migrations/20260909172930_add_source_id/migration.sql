-- AlterTable
ALTER TABLE "IndexedSource" ADD COLUMN     "sourceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "IndexedSource_sourceId_key" ON "IndexedSource"("sourceId");

