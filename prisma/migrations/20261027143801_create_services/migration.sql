/*
  Warnings:

  - You are about to drop the column `duration` on the `services` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `services` table. All the data in the column will be lost.
  - Added the required column `duration_in_minutes` to the `services` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `services` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `services` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "services" DROP COLUMN "duration",
DROP COLUMN "name",
ADD COLUMN     "duration_in_minutes" INTEGER NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL,
ALTER COLUMN "price" SET DATA TYPE DECIMAL(65,30);

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
