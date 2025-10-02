-- CreateEnum
CREATE TYPE "ESPProvider" AS ENUM ('MAILCHIMP', 'GETRESPONSE');

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "provider" "ESPProvider" NOT NULL,
    "apiKey" TEXT NOT NULL,
    "meta" JSONB,
    "isValid" BOOLEAN NOT NULL DEFAULT false,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);
