-- DropIndex
DROP INDEX "DailyLog_rabbitId_date_key";

-- AlterTable
ALTER TABLE "DailyLog" ADD COLUMN     "period" TEXT NOT NULL DEFAULT 'am';

-- CreateIndex
CREATE UNIQUE INDEX "DailyLog_rabbitId_date_period_key" ON "DailyLog"("rabbitId", "date", "period");

