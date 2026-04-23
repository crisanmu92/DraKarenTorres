ALTER TABLE "AppUser"
ADD COLUMN "email" TEXT;

UPDATE "AppUser"
SET "email" = "username"
WHERE "email" IS NULL;

ALTER TABLE "AppUser"
ALTER COLUMN "email" SET NOT NULL;

CREATE UNIQUE INDEX "AppUser_email_key" ON "AppUser"("email");
CREATE INDEX "AppUser_email_idx" ON "AppUser"("email");
