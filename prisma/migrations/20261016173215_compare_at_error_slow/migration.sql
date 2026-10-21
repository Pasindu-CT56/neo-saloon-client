/*
  Warnings:

  - You are about to drop the column `compareAT` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "compareAT",
ADD COLUMN     "compareAt" DOUBLE PRECISION;
