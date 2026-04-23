CREATE TABLE "AppUser" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppUser_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppUser_username_key" ON "AppUser"("username");
CREATE INDEX "AppUser_username_idx" ON "AppUser"("username");
CREATE UNIQUE INDEX "AppSession_tokenHash_key" ON "AppSession"("tokenHash");
CREATE INDEX "AppSession_userId_idx" ON "AppSession"("userId");
CREATE INDEX "AppSession_expiresAt_idx" ON "AppSession"("expiresAt");

ALTER TABLE "AppSession"
ADD CONSTRAINT "AppSession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
