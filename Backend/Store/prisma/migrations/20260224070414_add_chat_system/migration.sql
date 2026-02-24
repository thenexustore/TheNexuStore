-- CreateEnum
CREATE TYPE "ChatStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ChatSenderType" AS ENUM ('CUSTOMER', 'STAFF', 'SYSTEM');

-- CreateTable
CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "status" "ChatStatus" NOT NULL DEFAULT 'OPEN',
    "subject" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_type" "ChatSenderType" NOT NULL,
    "sender_id" TEXT,
    "content" TEXT NOT NULL,
    "image_base64" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestChatSession" (
    "id" TEXT NOT NULL,
    "session_ref" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatConversation_customer_id_idx" ON "ChatConversation"("customer_id");

-- CreateIndex
CREATE INDEX "ChatConversation_status_idx" ON "ChatConversation"("status");

-- CreateIndex
CREATE INDEX "ChatMessage_conversation_id_idx" ON "ChatMessage"("conversation_id");

-- CreateIndex
CREATE UNIQUE INDEX "GuestChatSession_session_ref_key" ON "GuestChatSession"("session_ref");

-- CreateIndex
CREATE UNIQUE INDEX "GuestChatSession_customer_id_key" ON "GuestChatSession"("customer_id");

-- CreateIndex
CREATE INDEX "GuestChatSession_session_ref_idx" ON "GuestChatSession"("session_ref");

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestChatSession" ADD CONSTRAINT "GuestChatSession_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
