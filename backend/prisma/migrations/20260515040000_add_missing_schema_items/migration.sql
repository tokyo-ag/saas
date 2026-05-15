-- Add missing Plan enum value
ALTER TYPE "Plan" ADD VALUE IF NOT EXISTS 'pro';

-- Add missing columns to tenants
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "banned_at" TIMESTAMP(3);

-- Add missing columns to events
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "price_male" INTEGER;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "price_female" INTEGER;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "payment_timing" VARCHAR(20) NOT NULL DEFAULT 'onsite';
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "notify_on_reserve_app" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "remind_app" BOOLEAN NOT NULL DEFAULT false;

-- Add missing columns to members
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "show_events_to_connections" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "blocked_at" TIMESTAMP(3);

-- Restore email and password_hash to organizer_accounts (removed in line_auth_only migration)
ALTER TABLE "organizer_accounts" ADD COLUMN IF NOT EXISTS "email" VARCHAR(200);
ALTER TABLE "organizer_accounts" ADD COLUMN IF NOT EXISTS "password_hash" TEXT;
ALTER TABLE "organizer_accounts" ALTER COLUMN "line_user_id" DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "organizer_accounts_email_key" ON "organizer_accounts"("email");

-- Create notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "notifications_member_id_idx" ON "notifications"("member_id");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_member_id_fkey') THEN
    ALTER TABLE "notifications" ADD CONSTRAINT "notifications_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Create connections table
CREATE TABLE IF NOT EXISTS "connections" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "member1_id" TEXT NOT NULL,
    "member2_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "connections_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "connections_member1_id_member2_id_key" ON "connections"("member1_id", "member2_id");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'connections_member1_id_fkey') THEN
    ALTER TABLE "connections" ADD CONSTRAINT "connections_member1_id_fkey" FOREIGN KEY ("member1_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'connections_member2_id_fkey') THEN
    ALTER TABLE "connections" ADD CONSTRAINT "connections_member2_id_fkey" FOREIGN KEY ("member2_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Create messages table
CREATE TABLE IF NOT EXISTS "messages" (
    "id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_connection_id_fkey') THEN
    ALTER TABLE "messages" ADD CONSTRAINT "messages_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_sender_id_fkey') THEN
    ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Create admin_member_messages table
CREATE TABLE IF NOT EXISTS "admin_member_messages" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "from_admin" BOOLEAN NOT NULL DEFAULT false,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_member_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "admin_member_messages_tenant_id_member_id_idx" ON "admin_member_messages"("tenant_id", "member_id");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_member_messages_member_id_fkey') THEN
    ALTER TABLE "admin_member_messages" ADD CONSTRAINT "admin_member_messages_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Create support_messages table
CREATE TABLE IF NOT EXISTS "support_messages" (
    "id" TEXT NOT NULL,
    "line_user_id" VARCHAR(100) NOT NULL,
    "tenant_id" TEXT,
    "content" TEXT NOT NULL,
    "from_user" BOOLEAN NOT NULL DEFAULT true,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "support_messages_line_user_id_idx" ON "support_messages"("line_user_id");

-- Create banned_line_users table
CREATE TABLE IF NOT EXISTS "banned_line_users" (
    "id" TEXT NOT NULL,
    "line_user_id" VARCHAR(100) NOT NULL,
    "reason" TEXT,
    "banned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "banned_line_users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "banned_line_users_line_user_id_key" ON "banned_line_users"("line_user_id");

-- Create event_likes table
CREATE TABLE IF NOT EXISTS "event_likes" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "anonymous_id" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_likes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "event_likes_event_id_anonymous_id_key" ON "event_likes"("event_id", "anonymous_id");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_likes_event_id_fkey') THEN
    ALTER TABLE "event_likes" ADD CONSTRAINT "event_likes_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
